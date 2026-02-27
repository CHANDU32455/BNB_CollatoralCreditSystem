/**
 * Generates a fresh wallet for Greenfield-only usage.
 * Run: node scripts/gen-greenfield-wallet.mjs
 */
import { ethers } from "ethers";

const wallet = ethers.Wallet.createRandom();
console.log("\n====================================================");
console.log(" 🌿 BNB Greenfield Dedicated Wallet");
console.log("====================================================");
console.log(" Address    :", wallet.address);
console.log(" Private Key:", wallet.privateKey);
console.log("====================================================");
console.log("\n NEXT STEPS:");
console.log(" 1. Add to your .env:");
console.log(`    GREENFIELD_PRIVATE_KEY=${wallet.privateKey.replace("0x", "")}`);
console.log("\n 2. Fund this address on Greenfield Testnet:");
console.log(`    → In DCellar testnet (https://testnet.dcellar.io)`);
console.log(`    → Transfer In → send 0.05 BNB to:`);
console.log(`      ${wallet.address}`);
console.log("\n 3. Verify balance at:");
console.log(`    https://testnet.greenfieldscan.com/account/${wallet.address}`);
console.log("====================================================\n");
