export const BACKEND_URL = import.meta.env.VITE_API_BASE;
export const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS;
export const CREDIT_MANAGER_ADDRESS = import.meta.env.VITE_CREDIT_MANAGER_ADDRESS;
export const CREDIT_TOKEN_ADDRESS = import.meta.env.VITE_CREDIT_TOKEN_ADDRESS;
export const OLD_VAULT_ADDRESS = import.meta.env.VITE_OLD_VAULT_ADDRESS;

export const VAULT_ABI = [
    "function vaults(address) view returns (uint256 collateralAmount, uint256 debtAmount, uint256 lastUpdated)",
    "function depositCollateral(address token, uint256 amount) external",
    "event CollateralDeposited(address indexed user, address indexed token, uint256 amount)",
    "receive()"
];

export const CREDIT_ABI = [
    "function borrow(uint256 amount) external",
    "function repay(uint256 amountUsd) external",
    "function withdrawCollateral(uint256 amount) external",
    "function getHealthFactor(address user) public view returns (uint256)",
    "function getBorrowCapacity(address user) public view returns (uint256)",
    "function getLatestPrice() public view returns (int256)",
    "function liquidate(address borrower) external payable",
    "event CreditIssued(address indexed user, uint256 amount)",
    "event DebtRepaid(address indexed user, uint256 amount, uint256 remainingDebt)",
    "event CollateralWithdrawn(address indexed user, uint256 amount)"
];

export const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export const LEGACY_VAULT_ABI = [
    "function withdrawCollateral(uint256) external",
    "function withdraw(uint256) external",
    "function withdrawToLiquidator(address, address, uint256) external",
    "function isManager(address) view returns (bool)",
    "function setManager(address, bool) external"
];
