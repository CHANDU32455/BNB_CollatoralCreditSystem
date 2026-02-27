import { expect } from "chai";
import { ethers } from "hardhat";
import { PQCVault, CreditManager, PriceOracle, VaultUSD } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BNB Collateral Credit System - Production Readiness Tests", function () {
    let vault: PQCVault;
    let creditManager: CreditManager;
    let priceOracle: PriceOracle;
    let vUsd: VaultUSD;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let guardian: SignerWithAddress;

    const INITIAL_PRICE = 60000000000n; // $600

    beforeEach(async function () {
        [owner, user, guardian] = await ethers.getSigners();

        // Deploy Oracle
        const OracleFactory = await ethers.getContractFactory("PriceOracle");
        priceOracle = await OracleFactory.deploy(INITIAL_PRICE) as unknown as PriceOracle;
        await priceOracle.setPrice(INITIAL_PRICE);

        // Deploy vUSD
        const TknFactory = await ethers.getContractFactory("VaultUSD");
        vUsd = await TknFactory.deploy() as unknown as VaultUSD;

        // Deploy Vault
        const VaultFactory = await ethers.getContractFactory("PQCVault");
        vault = await VaultFactory.deploy(guardian.address) as unknown as PQCVault;

        // Deploy CreditManager
        const MgrFactory = await ethers.getContractFactory("CreditManager");
        creditManager = await MgrFactory.deploy(
            await vault.getAddress(),
            await priceOracle.getAddress(),
            await vUsd.getAddress()
        ) as unknown as CreditManager;

        // Setup Roles
        await vault.setManager(await creditManager.getAddress(), true);
        await vUsd.transferOwnership(await creditManager.getAddress());
    });

    describe("Collateral & Borrowing", function () {
        it("Should allow user to deposit BNB as collateral", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await user.sendTransaction({
                to: await vault.getAddress(),
                value: depositAmount
            });

            const userVault = await vault.vaults(user.address);
            expect(userVault.collateralAmount).to.equal(depositAmount);
        });

        it("Should calculate correct borrow capacity (70% LTV)", async function () {
            const depositAmount = ethers.parseEther("1.0"); // $600 value
            await user.sendTransaction({ to: await vault.getAddress(), value: depositAmount });

            const capacity = await creditManager.getBorrowCapacity(user.address);
            // 1 BNB * $600 * 0.7 = $420
            expect(capacity).to.equal(ethers.parseEther("420"));
        });

        it("Should allow borrowing vUSD", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await user.sendTransaction({ to: await vault.getAddress(), value: depositAmount });

            await creditManager.connect(user).borrow(ethers.parseEther("100"));

            expect(await vUsd.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
            const userVault = await vault.vaults(user.address);
            expect(userVault.debtAmount).to.equal(ethers.parseEther("100"));
        });
    });

    describe("Liquidation", function () {
        it("Should allow liquidation if health factor < 1.0", async function () {
            // 1. User deposits 1 BNB ($600) and borrows $400 (Health ~ 1.2)
            await user.sendTransaction({ to: await vault.getAddress(), value: ethers.parseEther("1.0") });
            await creditManager.connect(user).borrow(ethers.parseEther("400"));

            // 2. Price crashes to $400. 
            // Health = (Collateral * Price * Threshold) / Debt
            // Health = (1 * 400 * 0.8) / 400 = 0.8 (< 1.0)
            await priceOracle.setPrice(40000000000n);

            const hf = await creditManager.getHealthFactor(user.address);
            expect(hf).to.be.below(ethers.parseEther("1.0"));

            // 3. Liquidator covers debt
            const debtInBnb = await creditManager.connect(owner).liquidate(user.address, { value: ethers.parseEther("1.0") });

            const userVaultAfter = await vault.vaults(user.address);
            expect(userVaultAfter.debtAmount).to.equal(0);
        });
    });
});
