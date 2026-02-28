import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import {
    BACKEND_URL,
    VAULT_ADDRESS,
    CREDIT_MANAGER_ADDRESS,
    CREDIT_TOKEN_ADDRESS,
    VAULT_ABI,
    CREDIT_ABI,
    ERC20_ABI,
    OLD_VAULT_ADDRESS
} from '../utils/constants';

export const useStats = (address: string | null) => {
    const [stats, setStats] = useState({
        collateral: '0.00',
        debt: '0.00',
        borrowCapacity: '0.00',
        price: '0',
        balance: '0.00',
        creditBalance: '0.00'
    });
    const [riskData, setRiskData] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [chainInfo, setChainInfo] = useState({ name: 'opBNB', block: '0' });
    const [hasMandate, setHasMandate] = useState(true);
    const [legacyCollateral, setLegacyCollateral] = useState('0.00');

    const fetchRiskScore = useCallback(async (addr: string) => {
        try {
            const resp = await axios.get(`${BACKEND_URL}/api/risk/score/${addr}`);
            setRiskData(resp.data);
        } catch (err) {
            console.error("Failed to fetch risk score");
        }
    }, []);

    const updateStats = useCallback(async (partial = false) => {
        if (!address || !(window as any).ethereum) return;
        setIsSyncing(true);

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const network = await provider.getNetwork();

            if (network.chainId !== 5611n) {
                setChainInfo({ name: 'WRONG NETWORK', block: '...' });
                setIsSyncing(false);
                return;
            }

            const blockNum = await provider.getBlockNumber();
            setChainInfo({ name: 'opBNB Testnet', block: blockNum.toString() });

            const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
            const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, provider);
            const tokenContract = new ethers.Contract(CREDIT_TOKEN_ADDRESS, ERC20_ABI, provider);

            const [vaultData, balanceRaw, creditRaw, rawPrice] = await Promise.all([
                vaultContract.vaults(address).catch(() => ({ collateralAmount: 0n, debtAmount: 0n })),
                provider.getBalance(address).catch(() => 0n),
                tokenContract.balanceOf(address).catch(() => 0n),
                creditContract.getLatestPrice().catch(() => 0n)
            ]);

            const bnbPrice = (rawPrice && rawPrice > 0n) ? parseFloat(rawPrice.toString()) / 1e8 : 586.50;
            const bonusFactor = riskData ? parseFloat(riskData.trustFactorBonus) / 100 : 0;

            const collatAmount = parseFloat(ethers.formatEther(vaultData.collateralAmount || 0n));
            const debtAmount = parseFloat(ethers.formatEther(vaultData.debtAmount || 0n));
            const collatUsd = collatAmount * bnbPrice;

            setStats({
                collateral: collatAmount.toFixed(6),
                debt: debtAmount.toFixed(6),
                borrowCapacity: (collatUsd * (0.7 + bonusFactor) - debtAmount).toFixed(2),
                price: bnbPrice.toFixed(2),
                balance: parseFloat(ethers.formatEther(balanceRaw)).toFixed(4),
                creditBalance: parseFloat(ethers.formatEther(creditRaw)).toFixed(2)
            });

            if (!partial) {
                const mResp = await axios.get(`${BACKEND_URL}/api/vault/mandate-status/${address}`);
                setHasMandate(mResp.data.hasMandate);

                if (OLD_VAULT_ADDRESS && OLD_VAULT_ADDRESS !== 'undefined') {
                    const legacyVault = new ethers.Contract(OLD_VAULT_ADDRESS, [
                        "function vaults(address) view returns (uint256 collateralAmount, uint256 debtAmount, uint256 lastUpdated)",
                    ], provider);
                    const lData = await legacyVault.vaults(address).catch(() => ({ collateralAmount: 0n }));
                    setLegacyCollateral(ethers.formatEther(lData.collateralAmount || 0n));
                }

            }

        } catch (err) {
            console.error("[Stats] Critical sync error:", err);
        } finally {
            setIsSyncing(false);
        }
    }, [address, riskData]);

    useEffect(() => {
        if (address) {
            fetchRiskScore(address);
        }
    }, [address, fetchRiskScore]);

    useEffect(() => {
        if (address) {
            updateStats();
            const timer = setInterval(() => updateStats(true), 30000);
            return () => clearInterval(timer);
        }
    }, [address, updateStats]);

    return {
        stats, riskData, isSyncing, chainInfo, hasMandate, legacyCollateral, updateStats, fetchRiskScore
    };
};
