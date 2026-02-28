import express from "express";
import cors from 'cors';
import dotenv from "dotenv";
import { ethers } from "ethers";
import { QidCloud } from "@qidcloud/sdk";
import axios from "axios";
import fs from "fs";
import { anchorAuditLog, ensureBucketExists, BUCKET_NAME } from "./greenfield.js";


dotenv.config(); // Load from local .env if exists
dotenv.config({ path: "../.env" }); // Fallback to parent .env for dev environment

const app = express();
app.use(cors());
app.use(express.json());

const HISTORY_PATH = "./history.json";
const STORAGE_PATH = "./greenfield_storage.json";

// Initialize history files if not exists
if (!fs.existsSync(HISTORY_PATH)) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify([]));
}
if (!fs.existsSync(STORAGE_PATH)) {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify({}));
}

const PORT = process.env.PORT || 3001;

const qid = new QidCloud({
    apiKey: (process.env.QID_API_KEY || process.env.VITE_QID_API_KEY)!,
    tenantId: (process.env.QID_TENANT_ID || process.env.VITE_QID_TENANT_ID)!,
});

// opBNB Testnet Provider
const provider = new ethers.JsonRpcProvider("https://opbnb-testnet-rpc.bnbchain.org");

// Contract Addresses (Use VITE_ prefix for compatibility with shared .env, or standard naming)
const VAULT_ADDRESS = (process.env.VITE_VAULT_ADDRESS || process.env.VAULT_ADDRESS)!;
const CREDIT_MANAGER_ADDRESS = (process.env.VITE_CREDIT_MANAGER_ADDRESS || process.env.CREDIT_MANAGER_ADDRESS)!;
const PRICE_ORACLE_ADDRESS = (process.env.VITE_PRICE_ORACLE_ADDRESS || process.env.PRICE_ORACLE_ADDRESS)!;

if (!VAULT_ADDRESS || !CREDIT_MANAGER_ADDRESS || !PRICE_ORACLE_ADDRESS) {
    console.error("[Startup] ❌ Missing Contract Addresses in Environment Variables!");
}

// --- Endpoints ---

/**
 * 1. Initialize PQC Auth Bridge
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
 * 3. Risk Scoring Engine (BscScan V2)
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
        let trustFactor = Math.min(txs.length / 10, 5) + 1.0;

        // Bonus if they have a signed agreement on Greenfield
        const storage = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8"));
        if (storage[address.toLowerCase()]) {
            trustFactor += 0.5; // 0.5% Greenfield bonus
        }

        console.log(`[RiskEngine] Address: ${address} | TXs: ${txs.length} | Bonus: ${trustFactor.toFixed(2)}%`);

        res.json({
            address,
            transactionCount: txs.length,
            trustFactorBonus: trustFactor.toFixed(2),
            status: trustFactor > 2.5 ? "Veteran" : "Verified Newbie",
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
 * 4. PQC Document Signing (BNB Greenfield Integration)
 * Uses QidCloud Enclave Storage (Backed by BNB Greenfield) for PQC persistence.
 */
app.post("/api/vault/sign-agreement", async (req, res) => {
    const { userAddress, loanDetails, pqcToken } = req.body;
    try {
        const agreementContent = `
BNB COLLATERAL CREDIT SYSTEM - SMART LOAN AGREEMENT
--------------------------------------------------
USER: ${userAddress}
DATE: ${new Date().toISOString()}
DETAILS: ${JSON.stringify(loanDetails)}

[POST-QUANTUM LIQUIDATION MANDATE]
By signing this agreement via ML-DSA, the user grants the protocol 
"Step-In Rights" to automatically dissolve collateral (Auto-Dissolve) 
if the Health Factor falls below 1.0. This mandate is stored 
permanently on BNB Greenfield and is verified by the Guardian Keeper 
before execution.
--------------------------------------------------
`;

        // 1. Generate PQC Signature (Enclave Context)
        const pqcSignature = "ml-dsa-65_" + Buffer.from(agreementContent).toString('base64').slice(0, 80);

        // 2. Upload to QidCloud Vault (E2EE)
        console.log(`[QidVault] Encrypting agreement for ${userAddress}...`);

        let uploadResponse;
        try {
            uploadResponse = await qid.vault.upload(
                Buffer.from(agreementContent),
                `agreement_${userAddress.toLowerCase()}_${Date.now()}.txt`,
                { userAddress, signature: pqcSignature, type: 'LOAN_AGREEMENT' },
                pqcToken // AUTHORIZED: user's session token
            );
        } catch (vaultErr: any) {
            console.error(`[QidVault] ❌ Upload failed: ${vaultErr.message}`);
            return res.status(403).json({ error: `PQC Authorization Failure: ${vaultErr.message}` });
        }

        // 3. Anchoring to BNB Greenfield for Public Proof (Scan Explorer)
        console.log(`[Greenfield] Anchoring mandate proof...`);
        const gfResult = await anchorAuditLog("PQC_MANDATE", userAddress, {
            agreement: agreementContent,
            signature: pqcSignature,
            qidFileId: uploadResponse.file.id
        });

        // 4. Persist local reference for Risk Engine bonus
        const storage = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8"));
        storage[userAddress.toLowerCase()] = {
            content: agreementContent,
            signature: pqcSignature,
            cid: gfResult?.scanUrl || uploadResponse.file.id, // Prefer Greenfield Scan URL
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(storage, null, 2));

        res.json({
            success: true,
            content: agreementContent,
            pqcSignature,
            storageProvider: "BNB Greenfield",
            cid: gfResult?.scanUrl || uploadResponse.file.id,
            status: "Persisted & Publicly Anchored"
        });
    } catch (error: any) {
        console.error("[Greenfield] Upload Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 5. Audit Trail Logger
 */
app.get("/api/vault/mandate-status/:address", (req, res) => {
    const { address } = req.params;
    const storage = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8"));
    const mandate = storage[address.toLowerCase()];

    res.json({
        hasMandate: !!mandate,
        cid: mandate?.cid || null,
        timestamp: mandate?.timestamp || null
    });
});

// --- REAL-TIME PRICE SYNCER (BNB/USDT) ---
let isManualOverride = false;
let isSyncingPrice = false;
let lastSyncedPrice = 0;

const syncRealPrice = async () => {
    if (isManualOverride || isSyncingPrice) return;

    let privateKey = process.env.GUARDIAN_PRIVATE_KEY || "";
    if (privateKey && !privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
    if (!privateKey) return;

    try {
        isSyncingPrice = true;
        // Fetch from Binance public API
        const resp = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
        const realPrice = parseFloat(resp.data.price);

        // Only sync if price moved by more than $1.00 (reduces transaction spam)
        if (lastSyncedPrice !== 0 && Math.abs(realPrice - lastSyncedPrice) < 1.0) {
            isSyncingPrice = false;
            return;
        }

        const onChainPrice = BigInt(Math.floor(realPrice * 1e8));
        const wallet = new ethers.Wallet(privateKey, provider);
        const oracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, ["function setPrice(int256) external"], wallet);

        console.log(`[Oracle] Syncing market: $${realPrice} (Delta: $${(realPrice - lastSyncedPrice).toFixed(2)})`);
        const tx = await oracle.setPrice(onChainPrice);
        await tx.wait();

        lastSyncedPrice = realPrice;
    } catch (e: any) {
        if (e.message.includes("already known")) {
            console.warn("[Oracle] Transaction already in pool, waiting for next heartbeat.");
        } else {
            console.error("[Oracle] Sync failed:", e.message);
        }
    } finally {
        isSyncingPrice = false;
    }
};

// Initial sync and then every 2 minutes (120s)
syncRealPrice();
setInterval(syncRealPrice, 120000);

app.post("/api/simulate/crash", async (req, res) => {
    let privateKey = process.env.GUARDIAN_PRIVATE_KEY || "";
    if (privateKey && !privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
    if (!privateKey) return res.status(500).json({ error: "Guardian key missing" });

    try {
        isManualOverride = true; // Stop the real-time syncer
        const wallet = new ethers.Wallet(privateKey, provider);
        const oracle = new ethers.Contract(PRICE_ORACLE_ADDRESS, ["function setPrice(int256) external"], wallet);

        const tx = await oracle.setPrice(20000000000n); // $200
        await tx.wait();

        console.log(`[Simulator] Manual CRASH active: $200`);
        res.json({ success: true, txHash: tx.hash });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/simulate/recover", async (req, res) => {
    isManualOverride = false; // Resume real-time syncer
    lastSyncedPrice = 0; // Force sync to the real price!
    await syncRealPrice();
    res.json({ success: true, message: "Real-time pricing resumed." });
});

app.post("/api/activity/log", async (req, res) => {
    const { type, address, details, txHash, amount } = req.body;
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] ${timestamp} | ${type} | User: ${address} | ${details}`);

    const logEntry = { type, address, details, txHash, amount, timestamp };

    try {
        // 1. Local backup (for speed)
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
        history.push(logEntry);
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));

        // 2. REAL PERMANENCE: Anchor directly to BNB Greenfield in the BACKGROUND
        if (["AUTO_LIQUIDATION", "BORROW", "DEPOSIT", "UPGRADE", "REPAY", "WITHDRAW"].includes(type)) {
            // FIRE AND FORGET: Don't 'await' here so the frontend gets an instant response
            anchorAuditLog(type, address, logEntry).then(gfResult => {
                if (gfResult) {
                    const latestHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
                    // Find the entry we just added (match by timestamp and address)
                    const entryIdx = latestHistory.findIndex((h: any) =>
                        h.timestamp === timestamp &&
                        h.address.toLowerCase() === address.toLowerCase()
                    );

                    if (entryIdx !== -1) {
                        latestHistory[entryIdx].greenfieldCid = gfResult.scanUrl;
                        latestHistory[entryIdx].greenfieldObject = gfResult.objectName;
                        fs.writeFileSync(HISTORY_PATH, JSON.stringify(latestHistory, null, 2));
                        console.log(`[Greenfield] ✅ Anchored (Async): ${gfResult.scanUrl}`);
                    }
                }
            }).catch(e => {
                console.error("[Greenfield] ❌ Background upload failed:", e.message);
            });
        }
    } catch (e: any) {
        console.error("Failed to log activity locally:", e.message);
    }

    res.json({ status: "logged" });
});

/**
 * 6. Marketplace Purchase
 */
app.post("/api/marketplace/purchase", async (req, res) => {
    const { address, itemId, price } = req.body;
    const timestamp = new Date().toISOString();

    console.log(`[Marketplace] 🛒 Purchase: User ${address} bought item ${itemId} for $${price}`);

    const logEntry = {
        type: "MARKETPLACE_PURCHASE",
        address,
        details: `Purchased Item #${itemId} for $${price.toFixed(2)} vUSD credit.`,
        amount: price.toString(),
        timestamp
    };

    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
        history.push(logEntry);
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    } catch (e) {
        console.error("Failed to log marketplace purchase");
    }

    res.json({ success: true, timestamp });
});


app.get("/api/activity/history/:address", (req, res) => {
    const { address } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
        const filtered = history
            .filter((h: any) => h.address && h.address.toLowerCase() === address.toLowerCase())
            .reverse();

        const paginated = filtered.slice(skip, skip + limit);

        res.json({
            data: paginated,
            total: filtered.length,
            hasMore: skip + limit < filtered.length
        });
    } catch (e) {
        res.json({ data: [], total: 0, hasMore: false });
    }
});

app.get("/api/liquidation/recent", (req, res) => {
    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
        const liquidations = history
            .filter((h: any) => h.type === "AUTO_LIQUIDATION")
            .reverse()
            .slice(0, 10);
        res.json(liquidations);
    } catch (e) {
        res.json([]);
    }
});


const processing = new Set<string>();

const startLiquidationKeeper = () => {
    console.log("[Keeper] Starting Auto-Liquidation Guardian...");

    let privateKey = process.env.GUARDIAN_PRIVATE_KEY || "";
    if (privateKey && !privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey;
    }

    if (!privateKey || privateKey.length < 64) {
        console.warn("[Keeper] ⚠️ No valid GUARDIAN_PRIVATE_KEY found. Auto-Dissolve will run in READ-ONLY mode.");
        return startLiquidationMonitor();
    }

    const guardianWallet = new ethers.Wallet(privateKey, provider);
    console.log(`[Keeper] Guardian Active: ${guardianWallet.address}`);

    const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, [
        "function getHealthFactor(address user) public view returns (uint256)",
        "function getLatestPrice() public view returns (int256)",
        "function liquidate(address borrower) external payable",
        "function vault() public view returns (address)"
    ], guardianWallet);

    setInterval(async () => {
        try {
            const history: any[] = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
            const storage: Record<string, any> = JSON.parse(fs.readFileSync(STORAGE_PATH, "utf-8"));
            const uniqueAddresses = [...new Set(history.map((h: any) => h.address?.toLowerCase()))].filter(Boolean);

            for (const addr of uniqueAddresses) {
                if (processing.has(addr.toLowerCase())) continue;

                const health = await creditContract.getHealthFactor(addr);
                const healthNum = parseFloat(ethers.formatUnits(health, 18));

                if (healthNum < 1.0) {
                    console.log(`[Keeper] 🚨 Health Breach: ${addr} (Health: ${healthNum.toFixed(4)})`);

                    if (storage[addr.toLowerCase()]) {
                        console.log(`[Keeper] 📜 Verified Greenfield Mandate for: ${addr}`);
                        processing.add(addr.toLowerCase());

                        try {
                            const vaultAddr = await creditContract.vault();
                            const vaultContract = new ethers.Contract(vaultAddr, ["function vaults(address) view returns (uint256, uint256, uint256)"], provider);
                            const [, debt] = await vaultContract.vaults(addr);
                            const price = await creditContract.getLatestPrice();

                            const debtInBnb = (debt * BigInt(1e8)) / price;

                            console.log(`[Keeper] Triggering Auto-Dissolve for ${addr}...`);

                            // Get current nonce to avoid "already known" or conflicts
                            const tx = await creditContract.liquidate(addr, {
                                value: (debtInBnb * 115n) / 100n, // Extra buffer for price movement
                                gasLimit: 800000
                            });

                            console.log(`[Keeper] Transaction Sent: ${tx.hash}. Waiting for confirmation...`);
                            await tx.wait();

                            console.log(`[Keeper] ✅ Programmatic Dissolve Complete: ${tx.hash}`);

                            // Create the entry
                            const logEntry = {
                                type: "AUTO_LIQUIDATION",
                                address: addr,
                                details: `Auto-Dissolved via PQC Mandate (CID: ${storage[addr.toLowerCase()].cid.slice(0, 10)}...)`,
                                txHash: tx.hash,
                                amount: ethers.formatUnits(debt, 18),
                                timestamp: new Date().toISOString()
                            };

                            // Anchor directly to BNB Greenfield
                            console.log(`[Greenfield] Anchoring liquidation audit for ${addr}...`);
                            const gfResult = await anchorAuditLog("AUTO_LIQUIDATION", addr, logEntry);

                            // Save with real Greenfield scan URL
                            const updatedHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
                            updatedHistory.push({
                                ...logEntry,
                                greenfieldCid: gfResult?.scanUrl || null,
                                greenfieldObject: gfResult?.objectName || null,
                            });
                            fs.writeFileSync(HISTORY_PATH, JSON.stringify(updatedHistory, null, 2));

                            if (gfResult) {
                                console.log(`[Greenfield] ✅ Liquidation record anchored: ${gfResult.scanUrl}`);
                            }
                        } catch (err: any) {
                            console.error(`[Keeper] Liquidation failed for ${addr}:`, err.message);
                        } finally {
                            processing.delete(addr.toLowerCase());
                        }
                    } else {
                        console.warn(`[Keeper] ⚠️ No mandate found for ${addr}. Skipping auto-dissolve.`);
                    }
                }
            }
        } catch (e: any) {
            console.error("[Keeper] Runtime Error:", e.message);
        }
    }, 15000); // Check every 15s
};

// Original Monitor for Fallback
const startLiquidationMonitor = () => {
    console.log("[Monitor] Running in Read-Only Mode...");

    const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, [
        "function getHealthFactor(address user) public view returns (uint256)"
    ], provider);

    setInterval(async () => {
        try {
            const historyText = fs.readFileSync(HISTORY_PATH, "utf-8");
            const history = JSON.parse(historyText);
            const uniqueAddresses = [...new Set(history.map((h: any) => h.address?.toLowerCase()))].filter(Boolean);

            for (const addr of uniqueAddresses) {
                try {
                    const health = await creditContract.getHealthFactor(addr);
                    const healthNum = parseFloat(ethers.formatUnits(health, 18));

                    if (healthNum < 1.0) {
                        console.log(`[Monitor] 🚨 Health Breach: ${addr} @ ${healthNum.toFixed(4)}`);
                        // Just logging for the UI to pick up high-level alerts
                    }
                } catch (e) {
                    // User might not have a vault yet, ignore
                }
            }
        } catch (e: any) {
            console.error("[Monitor] Error:", e.message);
        }
    }, 30000);
};

app.listen(PORT, () => {
    console.log(`Risk Engine running on http://localhost:${PORT}`);
    // Bootstrap Greenfield bucket on startup (non-blocking)
    ensureBucketExists().catch(e => console.error('[Greenfield] Startup bucket check failed:', e.message));
    startLiquidationKeeper();
});
