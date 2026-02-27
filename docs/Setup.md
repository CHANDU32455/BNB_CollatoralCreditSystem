# 🛠️ Setup & Local Development Guide

This guide will walk you through the process of setting up the **BNB Collateral Credit System** on your local machine for development or demo purposes.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js** (v18 or higher)
*   **npm** or **pnpm**
*   **MetaMask** browser extension
*   **Hardhat** (for contract interaction)

---

## 🚀 Quick Start (Whole System)

To run the entire ecosystem locally:

### 1. Clone the Repository
```bash
git clone https://github.com/YourRepo/BNB_CollateralCreditSystem.git
cd BNB_CollateralCreditSystem
```

### 2. Configure Environment Variables
You will need to set up `.env` files in three locations: the root, `frontend`, and `backend`.

**Root .env Template:**
```env
PRIVATE_KEY=your_metamask_private_key
BSCSCAN_API_KEY=your_bscscan_v2_api_key
VITE_QID_TENANT_ID=your_qid_tenant_id
VITE_QID_API_KEY=your_qid_api_key
GUARDIAN_PRIVATE_KEY=your_guardian_bot_private_key
```

### 3. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
cd ../contracts && npm install
```

---

## 🏗️ Running the Components

### **A. Backend (Risk Engine & Guardian Bot)**
The backend acts as the protocol's brain—syncing prices and running the liquidation Keeper.
```bash
cd backend
npm install
npm run dev
```
*   **Port:** `3001` (Ensure this port is free, as the frontend expects it).
*   **Logs to Watch:** 
    *   `[Oracle] Syncing market...` (Confirms real-time price feed is active).
    *   `[Keeper] Guardian Active...` (Confirms the search for unhealthy vaults has started).

### **B. Frontend (The "Premium" DApp)**
The visual interface for users and the Guardian Control Panel.
```bash
cd frontend
npm install
npm run dev
```
*   **URL:** `http://localhost:5173`
*   **Connection:** The frontend will auto-detect the backend on `localhost:3001`.
*   **Network:** Ensure MetaMask is set to **opBNB Testnet**.

---

## 🧪 Testing the "One-Click" Economy

1.  **Connect Wallet:** Login using the PQC Biometric Handshake.
2.  **Deposit:** Add a small amount of **tBNB** to your vault.
3.  **Marketplace:** Select an item like "Quantum Shield".
4.  **Auto-Borrow:** If you have 0 vUSD, the system will automatically borrow against your tBNB and complete the purchase in one flow.
5.  **Audit Log:** Check the "Audit History" to see the transaction CID anchored to **BNB Greenfield**.

---

## 🐛 Troubleshooting
*   **MetaMask Nonce issues:** Try "Clear activity tab data" in MetaMask settings if you encounter `replacement transaction underpriced`.
*   **RPC Connection:** Ensure you are using the official opBNB Testnet RPC: `https://opbnb-testnet-rpc.bnbchain.org`.

---

**Built with 💛 for the BNB Chain Developer Ecosystem.**
