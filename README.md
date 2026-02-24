# 🛡️ BNB Collateral Credit System (PQC Edition)

> **Quantum-Secure DeFi Lending & BNPL Marketplace on opBNB**

Built for the **BNB Chain Hackathon**, this project bridges the gap between decentralized finance and real-world commerce using state-of-the-art **Post-Quantum Cryptography (PQC)**.

## 🚀 Vision
As quantum computing approaches, traditional blockchain security is at risk. Our mission is to secure the future of BNB Chain commerce by integrating **ML-DSA (Module-Lattice-Based Digital Signature Algorithm)** signatures into every transaction, starting with a non-custodial collateralized credit system.

## ✨ Core Features
*   **🔒 PQC Security:** NIST-standard ML-DSA-65 signatures via QidCloud SDK.
*   **⚡ opBNB High-Speed:** Sub-cent transaction costs for credit-based shopping.
*   **📈 Smart Risk Engine:** Dynamic LTV adjustments based on BscScan V2 on-chain reputation.
*   **🥐 BNPL Marketplace:** Automatic borrowing and spending in one seamless UX.
*   **📊 Transparent Audit:** persistent backend indexer with CSV export of PQC-verified events.

## 🛠️ Tech Stack
*   **Blockchain:** Solidity (opBNB Testnet)
*   **Identity/PQC:** QidCloud (ML-DSA-65)
*   **Risk Analysis:** Node.js + BscScan API
*   **Frontend:** React (Vite) + Lucide + Glassmorphism UI
*   **Lending Model:** Collateralized Debt Position (CDP) with Health Factor monitoring.

## 📖 Documentation
*   [**Hackathon Guide**](./HACKATHON_GUIDE.md) - Deep dive into architecture, lessons learned, and setup.
*   [**Presentation Script**](./PRESENTATION_SCRIPT.md) - The ultimate guide on how to pitch and demo this project.

## 🏁 Quick Start
1.  **Backend:** `cd backend && npm install && npm run dev`
2.  **Frontend:** `cd frontend && npm install && npm run dev`
3.  **Contracts:** `cd contracts && npm install && npx hardhat run scripts/deploy.ts`

---

**Built with ❤️ for the BNB Chain Community.** 🏆🚀🛡️
