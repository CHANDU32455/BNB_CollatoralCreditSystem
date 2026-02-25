# 🏆 BNB Collateral Credit System: Hackathon Guide

## 1. What is it? (The Concept)
The **BNB Collateral Credit System** is a next-generation decentralized lending and payment platform. It allows users to lock **tBNB** as collateral in a non-custodial vault to instantly unlock high-liquidity **vUSD (Vault Credit)**. 

Unlike traditional lending, this system features a **PQC-Secured BNPL (Buy Now Pay Later) Marketplace**, where credit can be spent instantly at real-world simulated merchants using **Post-Quantum Cryptography**.

---

## 2. Why is it? (The Problem & Solution)
*   **The Problem:** Most DeFi lending platforms are clunky and disconnected from real commerce. Furthermore, as quantum computing advances, traditional ECDSA signatures (used by MetaMask) are at risk of being compromised.
*   **The Solution:** 
    *   **Quantum Resistance:** We use **ML-DSA-65** (NIST-standard Module-Lattice-Based Digital Signature Algorithm) via **QidCloud** to secure authorizations.
    *   **Seamless Spending:** Our **Auto-Borrow Bridge** eliminates the friction of manual borrowing. If you have collateral, you can spend—period.

---

## 3. How is it? (The Architecture)
*   **Blockchain (opBNB):** High-speed, low-cost Layer 2 for smart contract execution. 
*   **Decentralized Identity (QidCloud):** PQC Authentication and ML-DSA transaction signing.
*   **Risk Engine (BscScan V2):** Analyzes user transaction history on-chain to provide a "Trust Factor Bonus," increasing borrow capacity by up to 5%.
*   **Mini-Indexer (Backend):** A custom Node.js service that persists transaction history and PQC activity, ensuring a robust audit trail even if RPC providers are laggy.

---

## 4. Key Features
1.  **Glassmorphism Dashboard:** A premium, neon-themed UI designed to "WOW" judges at first glance.
2.  **PQC Authorization Modal:** Every merchant payment triggers a high-fidelity confirmation dialog, simulating a secure hardware-enclave signing event.
3.  **Credit Power Preview:** Users see exactly how much credit they will gain *before* they deposit collateral.
4.  **Auto-Borrow Logic:** The system automatically converts collateral to spendable credit during checkout if the user's balance is low.
5.  **Exportable Audit Trail:** A full history of all actions can be exported as a CSV for regulatory compliance.

---

## 5. Technical Setup (How to Run)

### **Prerequisites**
*   Node.js (v18+)
*   Metamask (Connected to opBNB Testnet)

### **Step 1: Smart Contracts**
```bash
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network opbnb_testnet
```

### **Step 2: Backend (Risk Engine & Indexer)**
```bash
cd backend
npm install
npx tsx watch src/index.ts
```

### **Step 3: Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
```

---

## 6. Demonstration Script (How to Present)

### **Introduction (30s)**
"Welcome to the BNB Collateral Credit System. We aren't just building a lending app; we're building the first **Post-Quantum Secure Commerce Bridge** on opBNB. Traditional DeFi is vulnerable to the quantum threat—our system is secured by ML-DSA signatures before the first qubit even drops."

### **The "Trust" Bonus (60s)**
"Notice how the user's **Reputation Badge** changes. Our backend analyzes their BscScan history to reward 'Veteran' users with a lower LTV requirement. We're using real on-chain data to make credit smarter."

### **The Seamless Spend (60s)**
"Watch the Marketplace. I want this Hardware Wallet, but I have $0 credit. Traditionally, I'd have to leave, borrow, and return. Here, I just click 'Authorize.' Our PQC Bridge automatically calculates my collateral, triggers an auto-borrow on opBNB, and completes the payment in one atomic-like flow."

### **Conclusion (30s)**
"Security meets Simplicity. This is the future of collateralized credit on the BNB Chain."

---

## 7. Lessons Learned & Building Process
*   **Challenge:** RPC Reliability. Public testnet RPCs can be flaky, causing the UI to show $0 balances.
*   **Solution:** We built a custom **Backend Indexer** that persists activity logs. This ensures the user's purchase history and "Veteran" status are always available and lightning-fast.
*   **Learning:** Building with PQC (Post-Quantum Cryptography) requires a shift in how we think about signing. Integrating ML-DSA signatures showed me that "Future-Proofing" is a UX challenge as much as a technical one.

---

**Built with ❤️ for the BNB Chain Hackathon.** 🏆🚀🛡️
