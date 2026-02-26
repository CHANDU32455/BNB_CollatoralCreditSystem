import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy PriceOracle (Mock for demo stability)
    const initialPrice = 58650000000n; // $586.50 (8 decimals)
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const oracle = await PriceOracle.deploy(initialPrice);
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log("PriceOracle deployed to:", oracleAddress);

    // 2. Deploy PQCVault
    const PQCVault = await ethers.getContractFactory("PQCVault");
    const vault = await PQCVault.deploy(deployer.address);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("PQCVault deployed to:", vaultAddress);

    // 3. Deploy VaultUSD Token
    const VaultUSD = await ethers.getContractFactory("VaultUSD");
    const vUsd = await VaultUSD.deploy();
    await vUsd.waitForDeployment();
    const vUsdAddress = await vUsd.getAddress();
    console.log("VaultUSD Token deployed to:", vUsdAddress);

    // 4. Deploy CreditManager
    const CreditManager = await ethers.getContractFactory("CreditManager");
    const creditManager = await CreditManager.deploy(vaultAddress, oracleAddress, vUsdAddress);
    await creditManager.waitForDeployment();
    const creditManagerAddress = await creditManager.getAddress();
    console.log("CreditManager deployed to:", creditManagerAddress);

    // 5. Setup Permissions
    console.log("Transferring VaultUSD ownership to CreditManager...");
    await vUsd.transferOwnership(creditManagerAddress);

    console.log("Authorizing CreditManager as a Vault Manager...");
    const tx = await vault.setManager(creditManagerAddress, true);
    await tx.wait();
    console.log("CreditManager successfully authorized.");

    // Update frontend and backend env files
    const rootDir = path.join(__dirname, "../../");
    const frontendEnvPath = path.join(rootDir, "frontend/.env");
    const backendEnvPath = path.join(rootDir, ".env");

    const envContent = `VITE_VAULT_ADDRESS=${vaultAddress}\nVITE_CREDIT_MANAGER_ADDRESS=${creditManagerAddress}\nVITE_CREDIT_TOKEN_ADDRESS=${vUsdAddress}\n`;

    // Note: In real scenarios, we'd preserve other vars, but here we can just append or write what's needed.
    // For simplicity, let's just log them so the user knows.

    // Save to a deployment file for easy reading by other scripts
    const deployInfo = {
        vault: vaultAddress,
        creditManager: creditManagerAddress,
        vUsd: vUsdAddress,
        priceOracle: oracleAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync(path.join(rootDir, "contracts/latest_deploy.json"), JSON.stringify(deployInfo, null, 2));

    console.log("\n--- UPDATED ADDRESSES ---");
    console.log(`VAULT: ${vaultAddress}`);
    console.log(`CREDIT_MANAGER: ${creditManagerAddress}`);
    console.log(`CREDIT_TOKEN: ${vUsdAddress}`);
    console.log(`PRICE_ORACLE: ${oracleAddress}`);
    console.log("--------------------------\n");

    console.log("Deployment completed successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
