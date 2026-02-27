/**
 * greenfield.ts
 * Direct BNB Greenfield integration using @bnb-chain/greenfield-js-sdk v2.
 * Files uploaded here are REAL Greenfield objects visible on testnet.greenfieldscan.com
 */
import { createRequire } from "module";
import { ethers } from "ethers";

// Use CJS require to avoid ESM named-export issue with the Greenfield SDK
const require = createRequire(import.meta.url);
const { Client, Long } = require("@bnb-chain/greenfield-js-sdk");

// ── Greenfield Testnet Config ──────────────────────────────────────────────────
const GRPC_URL = "https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org";
const GREEN_CHAIN_ID = "greenfield_5600-1";
const SP_ENDPOINT = "https://gnfd-testnet-sp1.bnbchain.org";

/** Bucket is public-read, globally unique. Fixed name for the protocol. */
export const BUCKET_NAME = "bnbvault-pqc-audit";

const client = Client.create(GRPC_URL, GREEN_CHAIN_ID);

// ── Helpers ────────────────────────────────────────────────────────────────────

function getNormalizedKey(): string {
    // Use the GUARDIAN_PRIVATE_KEY - the same wallet that owns the DCellar bucket.
    // delegateUploadObject uses ECDSA HTTP auth (not Cosmos TX), so no pubkey conflict.
    const pk = process.env.GUARDIAN_PRIVATE_KEY || "";
    return pk.startsWith("0x") ? pk : "0x" + pk;
}

function getOperatorAddress(): string {
    return new ethers.Wallet(getNormalizedKey()).address;
}

// ── Bucket Bootstrap ───────────────────────────────────────────────────────────

let bucketReady = false;

export async function ensureBucketExists(): Promise<void> {
    if (bucketReady) return;

    // Check if the bucket exists on Greenfield (created manually via DCellar UI)
    try {
        const res = await client.bucket.headBucket(BUCKET_NAME);
        if (res?.bucketInfo?.bucketName) {
            console.log(`[Greenfield] ✅ Bucket "${BUCKET_NAME}" confirmed on-chain.`);
            bucketReady = true;
            return;
        }
    } catch {
        // Bucket not found
    }

    // Bucket doesn't exist yet - user needs to create it manually in DCellar
    console.warn(`[Greenfield] ⚠️  Bucket "${BUCKET_NAME}" not found.`);
    console.warn(`[Greenfield] 👉 Create it at: https://testnet.dcellar.io`);
    console.warn(`[Greenfield]    Bucket name: ${BUCKET_NAME}  (visibility: Public Read)`);
    console.warn(`[Greenfield]    Uploads will be skipped until the bucket exists.`);
    // Leave bucketReady = false so we retry on next call
}

// ── Object Upload ──────────────────────────────────────────────────────────────

export interface GreenfieldUploadResult {
    objectName: string;
    bucketName: string;
    scanUrl: string;
}

/**
 * Upload a JSON audit log to BNB Greenfield via delegateUploadObject.
 * The SP handles on-chain object registration automatically.
 */
export async function uploadAuditToGreenfield(
    objectName: string,
    content: object | string
): Promise<GreenfieldUploadResult | null> {
    const privateKey = getNormalizedKey();
    const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    const contentBuffer = Buffer.from(contentStr, "utf-8");

    // NodeFile shape that the SDK expects in a Node.js context
    const nodeFile = {
        name: objectName,
        type: "application/json",
        size: contentBuffer.length,
        content: contentBuffer,
    };

    try {
        console.log(`[Greenfield] Uploading "${objectName}" (${contentBuffer.length}B)...`);

        const res = await client.object.delegateUploadObject(
            {
                bucketName: BUCKET_NAME,
                objectName,
                body: nodeFile,
                endpoint: SP_ENDPOINT,
                contentType: "application/json",
                delegatedOpts: {
                    visibility: 1, // PUBLIC_READ
                },
            },
            {
                type: "ECDSA",
                privateKey,
            }
        );

        // Non-2xx from the SP = failure
        if (res?.statusCode && res.statusCode >= 400) {
            throw new Error(`SP error ${res.statusCode}: ${res.message}`);
        }

        // After upload, fetch the on-chain object metadata to get its real hex ID
        // Greenfield Scan uses hex IDs: /object/0x000...001d4ebb  — NOT query params
        let scanUrl: string;
        try {
            const head = await client.object.headObject(BUCKET_NAME, objectName);
            const rawId = head?.objectInfo?.id ?? head?.objectInfo?.Id;
            if (rawId !== undefined && rawId !== null) {
                // Convert decimal ID to zero-padded 32-byte hex
                const hexId = "0x" + BigInt(rawId.toString()).toString(16).padStart(64, "0");
                scanUrl = `https://testnet.greenfieldscan.com/object/${hexId}`;
            } else {
                throw new Error("no ID in headObject response");
            }
        } catch {
            // Fallback: DCellar testnet supports bucket/object name navigation
            scanUrl = `https://testnet.dcellar.io/buckets/${BUCKET_NAME}/objects/${encodeURIComponent(objectName)}`;
        }

        console.log(`[Greenfield] ✅ Anchored → ${scanUrl}`);
        return { objectName, bucketName: BUCKET_NAME, scanUrl };
    } catch (err: any) {
        console.error(`[Greenfield] ❌ Upload failed for "${objectName}": ${err?.message}`);
        return null;
    }
}

/**
 * Build a canonical object name and anchor the audit log.
 * Gracefully no-ops if Greenfield is unavailable.
 */
export async function anchorAuditLog(
    type: string,
    address: string,
    logEntry: object
): Promise<{ objectName: string; scanUrl: string } | null> {
    await ensureBucketExists();

    const shortAddr = address.toLowerCase().replace("0x", "").slice(0, 6);
    const objectName = `audit_${type.toLowerCase()}_${shortAddr}_${Date.now()}.json`;

    const result = await uploadAuditToGreenfield(objectName, logEntry);
    return result ? { objectName: result.objectName, scanUrl: result.scanUrl } : null;
}
