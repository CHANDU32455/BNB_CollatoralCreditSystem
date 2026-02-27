import React, { createContext, useContext, useState } from 'react';
import { QidCloud } from '@qidcloud/sdk';
import axios from 'axios';
import { BACKEND_URL } from '../utils/constants';

interface AuthContextType {
    address: string | null;
    isLoggedIn: boolean;
    pqcSecured: boolean;
    pqcToken: string | null;
    loading: boolean;
    qid: QidCloud;
    connectWallet: () => Promise<void>;
    logout: () => Promise<void>;
    onPqcSuccess: (user: any, token: string) => void;
    finalizeLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [address, setAddress] = useState<string | null>(localStorage.getItem('vault_addr'));
    const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('vault_isLoggedIn') === 'true');
    const [pqcSecured, setPqcSecured] = useState(localStorage.getItem('vault_pqcSecured') === 'true');
    const [pqcToken, setPqcToken] = useState<string | null>(localStorage.getItem('vault_pqcToken'));
    const [loading, setLoading] = useState(false);

    const qid = new QidCloud({
        apiKey: import.meta.env.VITE_QID_API_KEY,
        tenantId: import.meta.env.VITE_QID_TENANT_ID
    });

    const connectWallet = async () => {
        if ((window as any).ethereum) {
            setLoading(true);
            try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                const addr = accounts[0];
                setAddress(addr);
                localStorage.setItem('vault_addr', addr);
            } catch (err) {
                console.error("Wallet connection failed", err);
            } finally {
                setLoading(false);
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const onPqcSuccess = (user: any, token: string) => {
        console.log("Qid Auth Success for user:", user);
        setPqcToken(token);
        setPqcSecured(true);
        localStorage.setItem('vault_pqcToken', token);
        localStorage.setItem('vault_pqcSecured', 'true');
    };

    const finalizeLogin = () => {
        if (address && pqcSecured) {
            setIsLoggedIn(true);
            localStorage.setItem('vault_isLoggedIn', 'true');
        } else {
            alert("Please connect both Wallet and PQC Auth!");
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            if (pqcToken) {
                await axios.post(`${BACKEND_URL}/api/auth/logout`, { token: pqcToken });
            }
            localStorage.clear();
            window.location.reload();
        } catch (err) {
            console.error("Logout failed", err);
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <AuthContext.Provider value={{
            address, isLoggedIn, pqcSecured, pqcToken, loading, qid,
            connectWallet, logout, onPqcSuccess, finalizeLogin
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
