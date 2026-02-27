# 🏗️ System Architecture: BNB Collateral Credit System (PQC)

This document provides a deep dive into the technical architecture of the **BNB Collateral Credit System**. The project follows a "Decentralized Trinity" model, leveraging the unique strengths of **opBNB**, **BNB Greenfield**, and **QidCloud PQC**.

---

## 🛰️ High-Level Component Overview

```mermaid
graph TD
    User((User Wallet)) -->|1. PQC Handshake| QidCloud[QidCloud PQC Enclave]
    QidCloud -->|2. Secure Session| DApp[React Frontend]
    
    subgraph backend [Intelligent Backend Node]
        Oracle[Binance Oracle Syncer] -->|Fetch| BinanceAPI[Binance Market Feed]
        Guardian[Guardian Bot] -->|Monitor| RPC[opBNB RPC]
        Indexer[Audit Indexer] -->|Store| Greenfield[BNB Greenfield Storage]
    end
    
    subgraph blockchain [opBNB Execution Layer]
        Vault[PQC Vault Contract]
        CM[Credit Manager]
        PriceOracle[On-Chain Price Oracle]
    end
    
    DApp -->|3. Transaction| Vault
    Vault -->|Collateral Status| CM
    PriceOracle -->|Live Price| CM
    CM -->|Calculate Health| DApp
    Guardian -->|4. Auto-Liquidation| CM
    CM -->|Audit Event| Indexer
```

---

## 🏛️ Layered Architecture

### 1. Execution Layer (opBNB Testnet)
The core financial logic is written in Solidity and deployed on **opBNB Testnet**. 
*   **Separation of Concerns:** Collateral management (`PQC_Vault`) is separated from the lending logic (`CreditManager`) to maximize security.
*   **Real-time Oracle:** A custom `PriceOracle` contract allows the Guardian Bot to push verified market prices on-chain, eliminating the lag issues associated with public testnet oracles.
*   **Atomic Credit:** The system uses 18-decimal precision for both tBNB and vUSD to ensure sub-cent accuracy during fractional marketplace payments.

### 2. Security & Identity Layer (QidCloud PQC)
Traditional ECDSA signatures are vulnerable to quantum Shor's algorithm. We solve this by wrapping every critical authorization in a **Post-Quantum Cryptography** layer.
*   **ML-DSA-65 signatures:** All sensitive mandates (like the "Liquidation Permission" or "High-Value Borrow") are authorized using NIST-standard module-lattice signatures.
*   **QR Bridge Handshake:** A secure mobile-to-web session that establishes a PQC-encrypted pipe for data exchange.

### 3. Auditing & Storage Layer (BNB Greenfield)
We treat **BNB Greenfield** as the protocol's "Black Box" flight recorder.
*   **Protocol-Managed Storage:** Users don't need to manage buckets. The system uses a **Tenant-Owned model** where the protocol pays for storage and anchors immutable logs on behalf of the user.
*   **E2EE Anchoring:** Audit records are formatted as JSON, signed by the PQC enclave, and uploaded with a specific Content-ID (CID). This link is displayed in the UI as the "Smoking Gun" proof of decentralized auditing.

---

## 🤖 The Guardian Bot & Oracle Engine

The backend isn't just a server; it's an **Autonomous Security Actor**. 

### **The Oracle Heartbeat**
The `Oracle Syncer` performs a high-frequency poll of the **Binance BNB/USDT ticker**. It calculates the current market volatility and pushes the price to the blockchain.
*   **Deviation Guard:** To save gas, it skips updates if the price hasn't moved by at least $0.05.
*   **Simulated Override:** Includes endpoints for the "Market Crash" demo, allowing judges to see the system react to artificial volatility.

### **The Liquidation Guardian**
The `Guardian Bot` is a 24/7 "Keeper". It continuously iterates through all active vaults on-chain.
1.  **Detection:** If a vault's `Health Factor < 1.0`, the bot alerts.
2.  **Validation:** It cross-references the user's PQC Mandate on Greenfield.
3.  **Execution:** It triggers the `liquidate` function on opBNB to close the position and recover debt, earning a 5% system fee.

---

## 📊 Data Flow: A "Seamless Spend" Event

1.  **Trigger:** User clicks "Authorize" in the Marketplace.
2.  **Logic:** The Frontend calculates `(Cost - Balance)`. If the user is short, it prepares an **Auto-Borrow** transaction.
3.  **Sign:** The **QidCloud SDK** prompts for a PQC session confirmation.
4.  **Execute:** The transaction hits **opBNB**, locking collateral and issuing credit in a single block.
5.  **Persist:** The result is indexed in our backend and a summary is anchored to **Greenfield** for the user's permanent audit trail.

---

## 📈 Tech Stack Summary
*   **Language:** TypeScript (Frontend & Backend), Solidity (Contracts).
*   **Frameworks:** React, Express, Hardhat.
*   **APIs:** Binance (Pricing), BscScan V2 (Reputation), QidCloud (PQC Identity).
*   **Hosting:** Decentralized data on BNB Greenfield.

---

**Built to secure the future of the BNB Chain Ecosystem.** 🏆🚀🛡️
