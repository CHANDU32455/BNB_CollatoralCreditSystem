import express from "express";
import cors from 'cors';
import dotenv from "dotenv";
import { ethers } from "ethers";
import { QidCloud } from "@qidcloud/sdk";
import axios from "axios";

dotenv.config({ path: "../../.env" });

const app = express();
app.use(cors());
app.use(express.json());

const HISTORY_PATH = "./history.json";
import fs from "fs";

// Initialize history file if not exists
if (!fs.existsSync(HISTORY_PATH)) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify([]));
}

const PORT = process.env.PORT || 3001;

// Initialize QidCloud SDK for PQC Auth & Signing
const qid = new QidCloud({
    apiKey: process.env.QID_API_KEY!,
    tenantId: process.env.QID_TENANT_ID!,
});

// opBNB Testnet Provider
const provider = new ethers.JsonRpcProvider("https://opbnb-testnet-rpc.bnbchain.org");

// Contract Addresses
const VAULT_ADDRESS = "0x353c722537450B764984F22869ac6Fb2225C0111";
const CREDIT_MANAGER_ADDRESS = "0xC4E50D8Eb1c0F423cE5343e62Ce156370dc464F0";

// --- Endpoints ---

/**
 * 1. Initialize PQC Auth Bridge
 * Generates a session and a QR code for mobile biometric scanning
 */
app.post("/api/auth/init", async (req, res) => {
    try {
        const session = await qid.auth.createSession();
        res.json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 2. Clear Session (Logout)
 */
app.post("/api/auth/logout", async (req, res) => {
    const { token } = req.body;
    try {
        if (token) {
            await qid.auth.logout(token);
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 2. Risk Scoring Engine (Etherscan V2)
 * Fetches user portfolio history to calculate a dynamic trust factor.
 */
app.get("/api/risk/score/:address", async (req, res) => {
    const { address } = req.params;
    console.log(`[RiskEngine] Scoring request for: ${address}`);
    try {
        const apiKey = process.env.BSCSCAN_API_KEY;
        const url = `https://api-testnet-opbnb.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

        let txs = [];
        try {
            const response = await axios.get(url, { timeout: 3000 });
            if (response.data && Array.isArray(response.data.result)) {
                txs = response.data.result;
            }
        } catch (apiErr) {
            console.warn(`[RiskEngine] BscScan API error for ${address}, using baseline`);
        }

        // Trust Factor: Base 1% + 0.1% per 10 txs (max 5% bonus)
        const trustFactor = Math.min(txs.length / 10, 5) + 1.0;

        console.log(`[RiskEngine] Address: ${address} | TXs: ${txs.length} | Bonus: ${trustFactor.toFixed(2)}%`);

        res.json({
            address,
            transactionCount: txs.length,
            trustFactorBonus: trustFactor.toFixed(2),
            status: txs.length > 5 ? "Veteran" : "Verified Newbie",
        });
    } catch (error: any) {
        console.error("[RiskEngine] Unexpected Error:", error.message);
        res.json({
            address,
            transactionCount: 0,
            trustFactorBonus: "1.00",
            status: "Baseline Checked",
        });
    }
});

/**
 * 3. PQC Document Signing (Greenfield Support)
 * Placeholder for signing loan agreements with ML-DSA
 */
app.post("/api/vault/sign-agreement", async (req, res) => {
    const { userAddress, loanDetails } = req.body;
    try {
        const agreementContent = `Loan Agreement for ${userAddress}: ${JSON.stringify(loanDetails)}`;

        // Mocking PQC signature for hackathon logic
        // This simulates a Post-Quantum secure ML-DSA signature
        const pqcSignature = "pqc_sig_" + Buffer.from(agreementContent).toString('base64').slice(0, 64);

        res.json({
            content: agreementContent,
            pqcSignature,
            storage: "BNB Greenfield (Pending)",
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 4. Audit Trail Logger
 * Captures PQC events and on-chain interactions for demonstration
 */
app.post("/api/activity/log", (req, res) => {
    const { type, address, details, txHash, amount } = req.body;
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] ${timestamp} | ${type} | User: ${address} | ${details}`);

    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
        history.push({ type, address, details, txHash, amount, timestamp });
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    } catch (e) {
        console.error("Failed to save history");
    }

    res.json({ status: "logged" });
});

app.get("/api/activity/history/:address", (req, res) => {
    const { address } = req.params;
    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
        const userHistory = history
            .filter((h: any) => h.address.toLowerCase() === address.toLowerCase())
            .reverse()
            .slice(0, 10);
        res.json(userHistory);
    } catch (e) {
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`Risk Engine running on http://localhost:${PORT}`);
});
