import { useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import {
    BACKEND_URL,
    VAULT_ADDRESS,
    CREDIT_MANAGER_ADDRESS,
    CREDIT_TOKEN_ADDRESS,
    CREDIT_ABI,
    ERC20_ABI
} from '../utils/constants';

export const useBlockchain = (address: string | null) => {
    const getProvider = useCallback(async () => {
        if (!(window as any).ethereum) throw new Error("MetaMask not found");
        return new ethers.BrowserProvider((window as any).ethereum);
    }, []);

    const getSigner = useCallback(async () => {
        const provider = await getProvider();
        return await provider.getSigner();
    }, [getProvider]);

    const logActivity = useCallback(async (type: string, details: string, txHash?: string, amount?: string) => {
        try {
            await axios.post(`${BACKEND_URL}/api/activity/log`, {
                type, address, details, txHash, amount
            });
        } catch (e) {
            // Background logging, ignore silence
        }
    }, [address]);

    const depositCollateral = async (amount: string) => {
        if (!address) return;
        const signer = await getSigner();
        const provider = await getProvider();

        // Let provider/MetaMask handle nonce to avoid "underpriced" errors
        // but add a healthy gas buffer to clear transactions instantly
        const feeData = await provider.getFeeData();
        const gasPrice = (feeData.gasPrice! * 140n) / 100n; // 40% buffer for instant inclusion

        const tx = await signer.sendTransaction({
            to: VAULT_ADDRESS,
            value: ethers.parseEther(amount),
            gasPrice
        });

        await tx.wait();
        await logActivity("DEPOSIT", `${amount} tBNB locked in Vault`, tx.hash, amount);
        return tx;
    };

    const borrowCredit = async (amount: string) => {
        if (!address) return;
        const signer = await getSigner();
        const provider = await getProvider();
        const contract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, signer);

        const feeData = await provider.getFeeData();
        const gasPrice = (feeData.gasPrice! * 140n) / 100n;

        const tx = await contract.borrow(ethers.parseEther(amount), { gasPrice });
        await tx.wait();
        await logActivity("BORROW", `Issued $${amount} USD Credit`, tx.hash, amount);
        return tx;
    };

    const repayDebt = async (amount: string) => {
        if (!address) return;
        const signer = await getSigner();
        const provider = await getProvider();
        const amountWei = ethers.parseEther(amount);

        const feeData = await provider.getFeeData();
        const gasPrice = (feeData.gasPrice! * 140n) / 100n;

        const vUsdContract = new ethers.Contract(CREDIT_TOKEN_ADDRESS, ERC20_ABI, signer);
        const approveTx = await vUsdContract.approve(CREDIT_MANAGER_ADDRESS, amountWei, { gasPrice });
        await approveTx.wait();

        const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, signer);
        const tx = await creditContract.repay(amountWei, { gasPrice });
        await tx.wait();

        await logActivity("REPAY", `Repaid $${amount} USD debt`, tx.hash, amount);
        return tx;
    };

    const withdrawCollateral = async (amount: string) => {
        if (!address) return;
        const signer = await getSigner();
        const provider = await getProvider();
        const feeData = await provider.getFeeData();
        const gasPrice = (feeData.gasPrice! * 140n) / 100n;

        const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, signer);
        const amountWei = ethers.parseEther(amount);

        const tx = await creditContract.withdrawCollateral(amountWei, { gasPrice });
        await tx.wait();
        await logActivity("WITHDRAW", `Withdrew ${amount} tBNB collateral`, tx.hash, amount);
        return tx;
    };


    return {
        depositCollateral,
        borrowCredit,
        repayDebt,
        withdrawCollateral,
        logActivity
    };
};
