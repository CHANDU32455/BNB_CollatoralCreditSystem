import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy PQCVault
    // For the hackathon MVP, we use the deployer as the initial PQC Guardian
    const PQCVault = await ethers.getContractFactory("PQCVault");
    const vault = await PQCVault.deploy(deployer.address);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("PQCVault deployed to:", vaultAddress);

    // 2. Deploy VaultUSD Token
    const VaultUSD = await ethers.getContractFactory("VaultUSD");
    const vUsd = await VaultUSD.deploy();
    await vUsd.waitForDeployment();
    const vUsdAddress = await vUsd.getAddress();
    console.log("VaultUSD Token deployed to:", vUsdAddress);

    // 3. Deploy CreditManager with BNB/USD Price Feed & vUSD
    const BnbUsdPriceFeed = "0x73110e8602930f01bb584Bc683C5Aa2Fb4D42419";
    const CreditManager = await ethers.getContractFactory("CreditManager");
    const creditManager = await CreditManager.deploy(vaultAddress, BnbUsdPriceFeed, vUsdAddress);
    await creditManager.waitForDeployment();
    const creditManagerAddress = await creditManager.getAddress();
    console.log("CreditManager deployed to:", creditManagerAddress);

    // 4. Transfer VaultUSD ownership to CreditManager so it can mint
    console.log("Transferring VaultUSD ownership to CreditManager...");
    await vUsd.transferOwnership(creditManagerAddress);

    // 5. Authorize CreditManager in PQCVault
    console.log("Authorizing CreditManager as a Vault Manager...");
    const tx = await vault.setManager(creditManagerAddress, true);
    await tx.wait();
    console.log("CreditManager successfully authorized.");

    console.log("Deployment completed successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
