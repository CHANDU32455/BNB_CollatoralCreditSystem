// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PQC_Vault
 * @dev Non-custodial vault for PQC Smart Collateral system.
 */
contract PQCVault is ReentrancyGuard, Ownable {
    struct Vault {
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 lastUpdated;
    }

    mapping(address => Vault) public vaults;
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public isManager;
    
    // The address authorized to bridge PQC verification results
    address public pqcGuardian;

    event CollateralDeposited(address indexed user, address token, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event ManagerStatusUpdated(address indexed manager, bool status);
    event DebtUpdated(address indexed user, uint256 newDebt);

    constructor(address _pqcGuardian) Ownable(msg.sender) {
        pqcGuardian = _pqcGuardian;
    }

    modifier onlyPQCAuthorized() {
        require(msg.sender == pqcGuardian, "PQC: Not authorized by Guardian");
        _;
    }

    modifier onlyManager() {
        require(isManager[msg.sender], "Vault: Not an authorized Manager");
        _;
    }

    function setManager(address _manager, bool _status) external onlyOwner {
        isManager[_manager] = _status;
        emit ManagerStatusUpdated(_manager, _status);
    }

    function setPQCGuardian(address _newGuardian) external onlyOwner {
        pqcGuardian = _newGuardian;
    }

    function depositCollateral(address token, uint256 amount) external nonReentrant {
        require(supportedTokens[token], "Vault: Unsupported token");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        vaults[msg.sender].collateralAmount += amount;
        vaults[msg.sender].lastUpdated = block.timestamp;

        emit CollateralDeposited(msg.sender, token, amount);
    }

    function updateDebt(address user, uint256 newDebt) external onlyManager {
        vaults[user].debtAmount = newDebt;
        vaults[user].lastUpdated = block.timestamp;
        emit DebtUpdated(user, newDebt);
    }

    function withdrawToLiquidator(address borrower, address liquidator, uint256 amount) external onlyManager nonReentrant {
        require(vaults[borrower].collateralAmount >= amount, "Vault: Insufficient collateral to seize");
        
        vaults[borrower].collateralAmount -= amount;
        payable(liquidator).transfer(amount);

        emit CollateralWithdrawn(borrower, amount);
    }

    /**
     * @dev Allows users to withdraw their own collateral if they have no debt.
     */
    function withdrawCollateral(uint256 amount) external nonReentrant {
        require(vaults[msg.sender].collateralAmount >= amount, "Vault: Insufficient balance");
        require(vaults[msg.sender].debtAmount == 0, "Vault: Cannot withdraw with active debt");

        vaults[msg.sender].collateralAmount -= amount;
        payable(msg.sender).transfer(amount);

        emit CollateralWithdrawn(msg.sender, amount);
    }
    
    receive() external payable {
        vaults[msg.sender].collateralAmount += msg.value;
        emit CollateralDeposited(msg.sender, address(0), msg.value);
    }
}
