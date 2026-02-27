// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PQCVault.sol";

interface IVaultUSD {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
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
 * @dev Manages borrowing, repayment, and liquidation logic.
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
    event DebtRepaid(address indexed user, uint256 amount, uint256 remainingDebt);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event LiquidationExecuted(address indexed borrower, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized);

    constructor(address payable _vaultAddress, address _priceFeed, address _creditToken) Ownable(msg.sender) {
        vault = PQCVault(_vaultAddress);
        priceFeed = AggregatorV3Interface(_priceFeed);
        creditToken = IVaultUSD(_creditToken);
    }

    /**
     * @dev Returns the latest BNB/USD price from oracle
     */
    function getLatestPrice() public view returns (int256) {
        ( , int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Max borrow capacity given current collateral and debt
     */
    function getBorrowCapacity(address user) public view returns (uint256) {
        (uint256 collateral, uint256 debt, ) = vault.vaults(user);
        if (collateral == 0) return 0;

        uint256 price = uint256(getLatestPrice());
        uint256 collateralValueUsd = (collateral * price) / 1e8; 
        uint256 maxBorrowUsd = (collateralValueUsd * LTV_RATIO) / BPS_DIVIDER;
        
        if (maxBorrowUsd <= debt) return 0;
        return maxBorrowUsd - debt;
    }

    /**
     * @dev Health Factor: < 1e18 means liquidatable.
     *      Calculated as (CollateralUsd × LiquidationThreshold) / Debt
     */
    function getHealthFactor(address user) public view returns (uint256) {
        (uint256 collateral, uint256 debt, ) = vault.vaults(user);
        if (debt == 0) return 100 * 1e18; // healthy

        uint256 price = uint256(getLatestPrice());
        uint256 collateralValueUsd = (collateral * price) / 1e8;
        uint256 collateralValueInDebtPower = (collateralValueUsd * LIQUIDATION_THRESHOLD) / BPS_DIVIDER;
        return (collateralValueInDebtPower * 1e18) / debt;
    }

    /**
     * @dev Borrow vUSD against locked BNB collateral (up to 70% LTV)
     */
    function borrow(uint256 amountUsd) external nonReentrant {
        uint256 capacity = getBorrowCapacity(msg.sender);
        require(amountUsd <= capacity, "CreditManager: Insufficient capacity (LTV breach)");

        ( , uint256 debt, ) = vault.vaults(msg.sender);
        vault.updateDebt(msg.sender, debt + amountUsd);
        creditToken.mint(msg.sender, amountUsd);

        emit CreditIssued(msg.sender, amountUsd);
    }

    /**
     * @dev Repay vUSD debt (partial or full).
     *      User must approve this contract to spend their vUSD before calling.
     *      After full repayment, user can withdraw collateral via the vault.
     */
    function repay(uint256 amountUsd) external nonReentrant {
        ( , uint256 debt, ) = vault.vaults(msg.sender);
        require(debt > 0, "CreditManager: No active debt");
        require(amountUsd > 0, "CreditManager: Amount must be > 0");
        require(amountUsd <= debt, "CreditManager: Cannot repay more than debt");
        require(creditToken.balanceOf(msg.sender) >= amountUsd, "CreditManager: Insufficient vUSD balance");
        require(creditToken.allowance(msg.sender, address(this)) >= amountUsd, "CreditManager: Approve vUSD first");

        uint256 newDebt = debt - amountUsd;

        // Burn the vUSD tokens (destroy the credit)
        creditToken.burn(msg.sender, amountUsd);

        // Reduce recorded debt in vault
        vault.updateDebt(msg.sender, newDebt);

        emit DebtRepaid(msg.sender, amountUsd, newDebt);
    }

    /**
     * @dev Withdraw collateral — only if debt is fully repaid (handled by vault)
     */
    function withdrawCollateral(uint256 amount) external nonReentrant {
        ( , uint256 debt, ) = vault.vaults(msg.sender);
        require(debt == 0, "CreditManager: Repay all debt first");
        vault.withdrawCollateral(amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Liquidate an underwater position (health < 1.0).
     *      Liquidator pays debt in BNB, receives collateral + 5% bonus.
     */
    function liquidate(address borrower) external payable nonReentrant {
        uint256 health = getHealthFactor(borrower);
        require(health < 1e18, "CreditManager: Borrower is still healthy");

        (uint256 collateral, uint256 debt, ) = vault.vaults(borrower);
        uint256 price = uint256(getLatestPrice());
        
        uint256 debtInBnb = (debt * 1e8) / price;
        require(msg.value >= debtInBnb, "CreditManager: Insufficient BNB to cover USD debt");

        uint256 collateralToSeize = (debtInBnb * (BPS_DIVIDER + LIQUIDATION_BONUS)) / BPS_DIVIDER;
        if (collateralToSeize > collateral) collateralToSeize = collateral;

        vault.updateDebt(borrower, 0);
        vault.withdrawToLiquidator(borrower, msg.sender, collateralToSeize);

        uint256 excess = msg.value - debtInBnb;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit LiquidationExecuted(borrower, msg.sender, debt, collateralToSeize);
    }
}
