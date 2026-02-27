# Implementation Plan - PQC Smart Collateral Credit System (BNB Chain Hackathon)

This project is a **Post-Quantum Secure (PQC) Smart Collateral-Based Credit System** built for the **BNB Chain Hackathon**. It leverages **opBNB** for high-frequency transactions, **BNB Greenfield** for decentralized storage, and **QidCloud** for PQC identity and secure data management.

## 0. Prerequisites
- [x] **opBNB Testnet Funds:** Ensure the wallet used for deployment has at least **0.5 tBNB** on opBNB Testnet.
- [x] **QidCloud Tenant:** Confirm `QID_TENANT_ID` and `QID_API_KEY` are active.
- [x] **Etherscan/BscScan API:** Ensure the `ETHERSCAN_API_KEY` is valid for portfolio scoring.
- [x] **Greenfield Storage:** Using QidCloud SDK for Protocol-Managed Greenfield anchoring.

## 1. Project Initialization
- [x] Create project structure and install dependencies (`@qidcloud/sdk`, `ethers`, `axios`).
- [x] Initialize **Hardhat** in `contracts/` for opBNB deployment.
- [x] Initialize **Express + TypeScript** in `backend/` for the Risk Engine and Guardian Bot.
- [x] Initialize **React + Vite** in `frontend/` for the "Premium" dashboard.

## 2. Smart Contract Development (opBNB)
- [x] **`PQC_Vault.sol`**: Non-custodial vault for locking collateral.
- [x] **`CreditManager.sol`**: Logic for issuing credit based on LTV and Health Factor.
- [x] **`PriceOracle.sol`**: Mock Oracle with update permissions for the Guardian Bot.
- [x] **`LiquidationEngine.sol`**: Logic to handle under-collateralized positions.

## 3. Backend & QidCloud Integration
- [x] **Identity:** Setup `QID Auth Bridge` for biometric PQC login.
- [x] **PQC Signing:** Implement ML-DSA-65 signatures for transaction authorization.
- [x] **Guardian Bot:** Implement a background "Keeper" that monitors Health Factors 24/7.
- [x] **Binance Oracle:** Real-time price syncer to push actual BNB/USDT market data to the chain.
- [x] **Greenfield:** Anchor critical audit logs to Greenfield to ensure immutability.

## 4. Frontend - "Wowed" UX
- [x] **Design System:** Implement a "Glassmorphism" theme with vibrant gradients.
- [x] **Dashboard:** Real-time gauges for "Borrow Capacity" and "Health Factor".
- [x] **Audit Log:** Dedicated security enclave showing Greenfield-anchored events.
- [x] **Liquidation Hub:** Dedicated tab for real-time system resolution tracking.
- [x] **Routing:** High-performance hash-based routing for bookmarkable states.

## 5. Deployment & Hackathon Submission
- [x] Deploy and verify smart contracts on **opBNB Testnet**.
- [x] Implement "Simulator" controls for crash/recover market demos.
- [x] Finalize README and project guides.
- [ ] Record high-quality demo video.
- [ ] Submit to the BNB Chain Hackathon portal.

## 6. Success Metrics
- [x] Post-Quantum security for all session authorizations.
- [x] Autonomous liquidation recovery (Self-healing system).
- [x] Verifiable, immutable audit trails on BNB Greenfield.

---
**Status: Production Ready for Demo** 🚀
