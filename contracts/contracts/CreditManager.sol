// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PQCVault.sol";

interface IVaultUSD {
    function mint(address to, uint256 amount) external;
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/**
 * @title CreditManager
 * @dev Manages borrowing logic and health factor calculations.
 */
contract CreditManager is ReentrancyGuard, Ownable {
    PQCVault public vault;
    IVaultUSD public creditToken;
    AggregatorV3Interface internal priceFeed;
    
    // 70% LTV for borrowing (7000 basis points)
    uint256 public constant LTV_RATIO = 7000;
    // 80% Liquidation Threshold (8000 basis points)
    uint256 public constant LIQUIDATION_THRESHOLD = 8000;
    uint256 public constant LIQUIDATION_BONUS = 500; // 5% reward for liquidators
    uint256 public constant BPS_DIVIDER = 10000;

    event CreditIssued(address indexed user, uint256 amount);
    event RepaymentMade(address indexed user, uint256 amount);
    event LiquidationExecuted(address indexed borrower, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized);

    constructor(address payable _vaultAddress, address _priceFeed, address _creditToken) Ownable(msg.sender) {
        vault = PQCVault(_vaultAddress);
        priceFeed = AggregatorV3Interface(_priceFeed);
        creditToken = IVaultUSD(_creditToken);
    }

    /**
     * @dev Returns the latest price from Chainlink Oracle
     */
    function getLatestPrice() public view returns (int256) {
        ( , int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Calculates maximum borrowable amount based on collateral and price.
     */
    function getBorrowCapacity(address user) public view returns (uint256) {
        (uint256 collateral, uint256 debt, ) = vault.vaults(user);
        if (collateral == 0) return 0;

        uint256 price = uint256(getLatestPrice());
        // Price has 8 decimals usually, but we work in 18 decimals for ETH/BNB
        // Standard Chainlink reward is in 8 decimals, but opBNB adapter might vary.
        // We assume price is normalized to 18 decimals or we handle it here.
        // For opBNB BNB/USD, it is usually 8 decimals.
        uint256 collateralValueUsd = (collateral * price) / 1e8; 
        
        uint256 maxBorrowUsd = (collateralValueUsd * LTV_RATIO) / BPS_DIVIDER;
        
        if (maxBorrowUsd <= debt) return 0;
        return maxBorrowUsd - debt;
    }

    /**
     * @dev Calculates health factor. < 1e18 means liquidatable.
     */
    function getHealthFactor(address user) public view returns (uint256) {
        (uint256 collateral, uint256 debt, ) = vault.vaults(user);
        if (debt == 0) return 100 * 1e18; // Super healthy

        uint256 price = uint256(getLatestPrice());
        uint256 collateralValueUsd = (collateral * price) / 1e8;

        // Health = (CollateralUsd * Threshold) / Debt
        uint256 collateralValueInDebtPower = (collateralValueUsd * LIQUIDATION_THRESHOLD) / BPS_DIVIDER;
        return (collateralValueInDebtPower * 1e18) / debt;
    }

    function borrow(uint256 amountUsd) external nonReentrant {
        uint256 capacity = getBorrowCapacity(msg.sender);
        require(amountUsd <= capacity, "CreditManager: Insufficient capacity (LTV breach)");

        ( , uint256 debt, ) = vault.vaults(msg.sender);
        uint256 newDebt = debt + amountUsd;
        
        vault.updateDebt(msg.sender, newDebt);
        
        // Mint the synthetic credit tokens to the user
        creditToken.mint(msg.sender, amountUsd);

        emit CreditIssued(msg.sender, amountUsd);
    }

    /**
     * @dev Default Logic: Liquidate a position that has fallen below the health threshold.
     */
    function liquidate(address borrower) external payable nonReentrant {
        uint256 health = getHealthFactor(borrower);
        require(health < 1e18, "CreditManager: Borrower is still healthy");

        (uint256 collateral, uint256 debt, ) = vault.vaults(borrower);
        uint256 price = uint256(getLatestPrice());
        
        // Debt is in USD. Liquidator must pay Debt in BNB.
        uint256 debtInBnb = (debt * 1e8) / price;
        require(msg.value >= debtInBnb, "CreditManager: Insufficient BNB to cover USD debt");

        // Calculate collateral to seize (with bonus)
        uint256 collateralToSeize = (debtInBnb * (BPS_DIVIDER + LIQUIDATION_BONUS)) / BPS_DIVIDER;
        if (collateralToSeize > collateral) collateralToSeize = collateral;

        // Reset borrower debt
        vault.updateDebt(borrower, 0);
        
        // Seize collateral from vault
        vault.withdrawToLiquidator(borrower, msg.sender, collateralToSeize);

        emit LiquidationExecuted(borrower, msg.sender, debt, collateralToSeize);
    }
}
