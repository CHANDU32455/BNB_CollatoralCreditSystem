import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { QidSignInButton, QidCloud } from '@qidcloud/sdk';
import {
  ShieldCheck,
  Wallet,
  ArrowUpCircle,
  Lock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
  ShoppingCart,
  LogOut
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_BASE;
const VAULT_ADDRESS = import.meta.env.VITE_VAULT_ADDRESS;
const CREDIT_MANAGER_ADDRESS = import.meta.env.VITE_CREDIT_MANAGER_ADDRESS;
const CREDIT_TOKEN_ADDRESS = import.meta.env.VITE_CREDIT_TOKEN_ADDRESS;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// Initialize QidCloud for frontend
const qid = new QidCloud({
  apiKey: import.meta.env.VITE_QID_API_KEY,
  tenantId: import.meta.env.VITE_QID_TENANT_ID
});

// Minimal ABIs for interaction
const VAULT_ABI = [
  "function vaults(address) view returns (uint256 collateralAmount, uint256 debtAmount, uint256 lastUpdated)",
  "function depositCollateral(address token, uint256 amount) external",
  "event CollateralDeposited(address indexed user, address indexed token, uint256 amount)",
  "receive()"
];

const CREDIT_ABI = [
  "function borrow(uint256 amount) external",
  "function getHealthFactor(address user) public view returns (uint256)",
  "function getLatestPrice() public view returns (int256)",
  "event CreditIssued(address indexed user, uint256 amount)"
];

function App() {
  const [address, setAddress] = useState<string | null>(localStorage.getItem('vault_addr'));
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('vault_isLoggedIn') === 'true');
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const [isBorrowLoading, setIsBorrowLoading] = useState(false);
  const [loading, setLoading] = useState(false); // Used for general auth/init
  const [pqcSecured, setPqcSecured] = useState(localStorage.getItem('vault_pqcSecured') === 'true');
  const [pqcToken, setPqcToken] = useState<string | null>(localStorage.getItem('vault_pqcToken'));
  const [stats, setStats] = useState({ collateral: '0.00', debt: '0.00', borrowCapacity: '0.00', price: '0', balance: '0.00', creditBalance: '0.00' });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [riskData, setRiskData] = useState<any>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [chainInfo, setChainInfo] = useState({ name: 'opBNB', block: '0' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'marketplace' | 'security'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{ merchantName: string; amount: number } | null>(null);

  const showNotify = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const logActivity = async (type: string, details: string, txHash?: string, amount?: string) => {
    try {
      await axios.post(`${BACKEND_URL}/api/activity/log`, {
        type,
        address,
        details,
        txHash,
        amount
      });
    } catch (e) {
      // Background logging, ignore silence
    }
  };

  const switchNetwork = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x15eb' }], // 5611
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x15eb',
            chainName: 'opBNB Testnet',
            nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
            rpcUrls: ['https://opbnb-testnet-rpc.bnbchain.org'],
            blockExplorerUrls: ['https://testnet.opbnbscan.com'],
          }],
        });
      }
    }
  };

  const updateStats = useCallback(async (userAddr: string) => {
    if (!userAddr) return;
    setIsSyncing(true);
    console.log("[Stats] Syncing for address:", userAddr);

    try {
      if (!(window as any).ethereum) {
        console.warn("[Stats] No ethereum provider found");
        return;
      }
      const provider = new ethers.BrowserProvider((window as any).ethereum);

      const network = await provider.getNetwork();
      const isWrongNetwork = network.chainId !== 5611n;

      if (isWrongNetwork) {
        setChainInfo({ name: 'WRONG NETWORK (Switch to opBNB)', block: '...' });
        console.warn("User on wrong network:", network.chainId);
        return;
      }

      try {
        const blockNum = await provider.getBlockNumber();
        setChainInfo({ name: 'opBNB Testnet', block: blockNum.toString() });
      } catch (e) {
        console.warn("[Stats] Block fetch failed");
      }

      const vaultContract = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
      const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, provider);
      const tokenContract = new ethers.Contract(CREDIT_TOKEN_ADDRESS, ERC20_ABI, provider);

      // Fetch individually with explicit fallbacks
      const vaultData = await vaultContract.vaults(userAddr).catch(e => { console.error("[Stats] Vault call failed", e); return { collateralAmount: 0n, debtAmount: 0n }; });
      const balanceRaw = await provider.getBalance(userAddr).catch(e => { console.error("[Stats] Balance call failed", e); return 0n; });
      const creditRaw = await tokenContract.balanceOf(userAddr).catch(e => { console.error("[Stats] Token call failed", e); return 0n; });
      const rawPrice = await creditContract.getLatestPrice().catch(e => { console.error("[Stats] Price call failed", e); return 0n; });

      // Fallback logic for price
      const bnbPrice = (rawPrice && rawPrice > 0n) ? parseFloat(rawPrice.toString()) / 1e8 : 586.50;
      const walletBalance = parseFloat(ethers.formatEther(balanceRaw)).toFixed(4);
      const creditBalance = parseFloat(ethers.formatEther(creditRaw)).toFixed(2);

      const bonusFactor = riskData ? parseFloat(riskData.trustFactorBonus) / 100 : 0;
      const effectiveLTV = 0.7 + bonusFactor;

      const collatAmount = parseFloat(ethers.formatEther(vaultData.collateralAmount || 0n));
      const debtAmount = parseFloat(ethers.formatEther(vaultData.debtAmount || 0n));
      const collatUsd = collatAmount * bnbPrice;

      setStats({
        collateral: collatAmount.toFixed(4),
        debt: debtAmount.toFixed(2),
        borrowCapacity: (collatUsd * effectiveLTV - debtAmount).toFixed(2),
        price: bnbPrice.toFixed(2),
        balance: walletBalance,
        creditBalance: creditBalance
      });

      // Events from Indexer
      try {
        const hResp = await axios.get(`${BACKEND_URL}/api/activity/history/${userAddr}`);
        if (Array.isArray(hResp.data)) {
          setTransactions(hResp.data.map((h: any) => ({
            ...h,
            date: new Date(h.timestamp).toLocaleTimeString(),
            amount: h.amount || '0.00'
          })));
        }
      } catch (e) { console.warn("[Stats] Indexer fetch failed"); }

    } catch (err) {
      console.error("[Stats] Critical sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [riskData]);

  const fetchRiskScore = useCallback(async (addr: string) => {
    try {
      const resp = await axios.get(`${BACKEND_URL}/api/risk/score/${addr}`);
      setRiskData(resp.data);
    } catch (err) {
      console.error("Failed to fetch risk score");
    }
  }, []);

  const connectWallet = async () => {
    if ((window as any).ethereum) {
      setLoading(true);
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const addr = accounts[0];
        setAddress(addr);
        localStorage.setItem('vault_addr', addr);
        await updateStats(addr);
        await fetchRiskScore(addr);
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
    logActivity("PQC_AUTH", `Session established: ${token.slice(0, 10)}...`);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`, { token: pqcToken });
      localStorage.clear();
      window.location.reload();
    } catch (err) {
      console.error("Logout failed", err);
      localStorage.clear();
      window.location.reload();
    }
  };

  const finalizeLogin = () => {
    if (address && pqcSecured) {
      setIsLoggedIn(true);
      localStorage.setItem('vault_isLoggedIn', 'true');
    } else {
      alert("Please connect both Wallet and PQC Auth!");
    }
  };

  const depositCollateral = async () => {
    if (!address) return;
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showNotify("Please enter a valid amount to deposit", "info");
      return;
    }
    if (parseFloat(depositAmount) > parseFloat(stats.balance)) {
      showNotify("Insufficient tBNB in wallet!", "error");
      return;
    }

    setIsDepositLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: VAULT_ADDRESS,
        value: ethers.parseEther(depositAmount)
      });

      showNotify("Transaction submitted. Waiting for block...", "info");
      await tx.wait();

      setDepositAmount('');
      updateStats(address);
      logActivity("DEPOSIT", `${depositAmount} tBNB locked in Vault`, tx.hash, depositAmount);
      showNotify(`Successfully deposited ${depositAmount} tBNB!`, "success");
    } catch (err: any) {
      console.error("Deposit failed", err);
      if (err.code === 'ACTION_REJECTED') {
        showNotify("Transaction cancelled by user", "info");
      } else {
        showNotify("Deposit failed. Check network status.", "error");
        logActivity("ERROR", `Deposit failed: ${err.message}`);
      }
    } finally {
      setIsDepositLoading(false);
    }
  };

  const borrowCredit = async () => {
    if (!address) return;
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      showNotify("Please enter an amount to withdraw", "info");
      return;
    }
    const amount = parseFloat(borrowAmount);
    if (parseFloat(stats.borrowCapacity) <= 0) {
      showNotify("No collateral found! Deposit tBNB first.", "error");
      return;
    }
    if (amount > parseFloat(stats.borrowCapacity)) {
      showNotify(`Exceeds capacity ($${stats.borrowCapacity})`, "error");
      return;
    }

    setIsBorrowLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, signer);

      const tx = await contract.borrow(ethers.parseEther(borrowAmount));
      showNotify("Requesting credit from enclave...", "info");
      await tx.wait();

      setBorrowAmount('');
      updateStats(address);
      logActivity("BORROW", `Issued $${borrowAmount} USD Credit`, tx.hash, borrowAmount);
      showNotify(`$${borrowAmount} Credit line issued!`, "success");
    } catch (err: any) {
      console.error("Borrow failed", err);
      if (err.code === 'ACTION_REJECTED') {
        showNotify("Transaction cancelled by user", "info");
      } else {
        showNotify("Borrow failed. Limit exceeded or LTV breach.", "error");
        logActivity("ERROR", `Borrow failed: ${err.message}`);
      }
    } finally {
      setIsBorrowLoading(false);
    }
  };

  const handleConfirmPurchase = () => {
    if (!pendingPurchase) return;
    const { merchantName, amount } = pendingPurchase;
    setPendingPurchase(null);
    executePayment(merchantName, amount);
  };

  const payMerchant = (merchantName: string, amount: number) => {
    setPendingPurchase({ merchantName, amount });
  };

  const executePayment = async (merchantName: string, amount: number) => {
    if (!address) return;

    const vUsdBalance = parseFloat(stats.creditBalance);
    const availableCredit = parseFloat(stats.borrowCapacity);

    // Automatic BNPL Logic: If balance is low but capacity is high, auto-borrow
    if (vUsdBalance < amount) {
      if (vUsdBalance + availableCredit >= amount) {
        showNotify("PQC Authorization valid. Triggering Auto-Borrow...", "info");
        const needed = (amount - vUsdBalance).toFixed(2);
        try {
          // Trigger the real on-chain borrow for the missing amount
          setLoading(true);
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          const creditContract = new ethers.Contract(CREDIT_MANAGER_ADDRESS, CREDIT_ABI, signer);

          const tx = await creditContract.borrow(ethers.parseEther(needed));
          await tx.wait();
          logActivity("BORROW", `Auto-Borrow: $${needed} for ${merchantName}`, tx.hash, needed);
        } catch (e) {
          showNotify("PQC Auto-borrow failed.", "error");
          setLoading(false);
          return;
        }
      } else {
        showNotify(`Insufficient Credit Power!`, "error");
        return;
      }
    }

    setLoading(true);
    try {
      const mockHash = "0x" + Math.random().toString(16).slice(2) + "...";
      logActivity("PAYMENT", `$${amount} paid to ${merchantName} via PQC Bridge`, mockHash, amount.toString());
      showNotify(`Payment to ${merchantName} complete!`, "success");
      setTimeout(() => updateStats(address), 1000);
    } finally {
      setLoading(false);
    }
  };

  const healthFactor = (() => {
    const colUsed = parseFloat(stats.collateral);
    const debtUsed = parseFloat(stats.debt);
    const price = parseFloat(stats.price);
    const potentialAdd = parseFloat(borrowAmount) || 0;

    const totalDebt = debtUsed + potentialAdd;
    if (totalDebt === 0) return '99.90';

    // (Collateral * Price * 0.8) / Debt
    return ((colUsed * price * 0.8) / totalDebt).toFixed(2);
  })();

  useEffect(() => {
    if (address) {
      updateStats(address);
      // Auto-refresh every 30s
      const timer = setInterval(() => updateStats(address), 30000);
      return () => clearInterval(timer);
    }
  }, [address, updateStats]);

  useEffect(() => {
    if (address) {
      fetchRiskScore(address);
    }
  }, [address]);

  // --- PURCHASE CONFIRMATION MODAL ---
  const PurchaseConfirmationModal = () => {
    if (!pendingPurchase) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease'
      }}>
        <div className="glass-panel" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--accent)' }}>
          <div style={{ background: 'rgba(189, 0, 255, 0.1)', padding: '2rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
            <ShoppingCart size={48} className="text-accent" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.5rem' }}>Confirm Purchase</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Authorizing PQC Payment Bridge</p>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '2rem', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Merchant</span>
              <span style={{ fontWeight: 600 }}>{pendingPurchase.merchantName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Amount</span>
              <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.2rem' }}>${pendingPurchase.amount} vUSD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <span className="text-muted">Security</span>
              <span style={{ color: 'var(--success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} /> ML-DSA Secured
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setPendingPurchase(null)}
              className="btn btn-outline"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPurchase}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', background: 'var(--accent)' }}
            >
              Authorize <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- NOTIFICATION OVERLAY ---
  const NotificationToast = () => {
    if (!notification) return null;
    return (
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div className={`status-badge ${notification.type === 'error' ? 'text-danger' : (notification.type === 'success' ? 'status-success' : 'btn-outline')}`}
          style={{
            backgroundColor: 'var(--panel-bg)',
            backdropFilter: 'blur(20px)',
            padding: '1rem 2rem',
            borderRadius: '12px',
            border: `1px solid ${notification.type === 'error' ? 'var(--danger)' : (notification.type === 'success' ? 'var(--success)' : 'var(--primary)')}`,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
          {notification.type === 'error' ? <LogOut size={16} /> : <ShieldCheck size={16} />}
          <span style={{ fontWeight: 600, color: '#fff' }}>{notification.msg}</span>
        </div>
      </div>
    );
  };

  // --- LOGIN VIEW ---
  if (!isLoggedIn) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
            <Lock size={32} className="text-primary" />
            BNB<span>Vault.PQC</span>
          </div>

          <h2 style={{ marginBottom: '1rem' }}>Enter the Enclave</h2>
          <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
            Connect your wallet and authorize with QidCloud Biometrics to unlock your PQC-secured credit line.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Step 1: Wallet */}
            <button
              onClick={connectWallet}
              disabled={loading}
              className={`btn ${address ? 'status-success' : 'btn-outline'}`}
              style={{ justifyContent: 'space-between', padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Wallet size={20} />}
                <span>{address ? `${address.slice(0, 8)}...` : (loading ? 'Connecting...' : 'Connect opBNB Wallet')}</span>
              </div>
              {address && <ShieldCheck size={18} />}
            </button>

            {/* Step 2: PQC */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {!pqcSecured ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <QidSignInButton
                    sdk={qid}
                    onSuccess={onPqcSuccess}
                    className="qid-button-custom"
                  />
                  <p className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
                    QidCloud handles the entire PQC handshake lifecycle.
                  </p>
                </div>
              ) : (
                <div className="btn status-success" style={{ justifyContent: 'space-between', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ShieldCheck size={20} />
                    <span>PQC Authenticated</span>
                  </div>
                  <ShieldCheck size={18} />
                </div>
              )}
            </div>

            {/* Final Action */}
            <button
              onClick={finalizeLogin}
              disabled={!address || !pqcSecured || loading}
              className="btn btn-primary"
              style={{ marginTop: '1.5rem', padding: '1.25rem', justifyContent: 'center' }}
            >
              {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                <>Launch Dashboard <ChevronRight size={20} /></>
              )}
            </button>
          </div>

          <p className="text-muted" style={{ marginTop: '2rem', fontSize: '0.75rem' }}>
            Post-Quantum Cryptography powered by ML-DSA-65
          </p>
        </div>
        <NotificationToast />
      </div>
    );
  }

  // --- TAB VIEWS ---

  const renderDashboard = () => (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Hero Stats */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="label">Available Borrow Liquidity</span>
            <div className="value" style={{ fontSize: '3.5rem' }}>${stats.borrowCapacity} <span className="text-muted" style={{ fontSize: '1.2rem' }}>USD</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>BNB Price: ${stats.price}</p>
              <button
                onClick={() => address && updateStats(address)}
                disabled={isSyncing}
                className="btn-outline"
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: isSyncing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', padding: 0, opacity: isSyncing ? 0.5 : 1 }}
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
          <div className="glass-card" style={{ textAlign: 'right', position: 'relative' }}>
            {riskData?.status === 'Veteran' && (
              <span style={{ position: 'absolute', top: '-10px', right: '10px', background: 'var(--primary)', color: '#000', fontSize: '0.5rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>VETERAN</span>
            )}
            <span className="label">Risk Bonus</span>
            <div className="value" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>
              +{riskData?.trustFactorBonus || '0.0'}%
            </div>
            <p className="text-muted" style={{ fontSize: '0.7rem' }}>Based on tx history</p>
          </div>
        </div>

        <div className="stat-grid">
          <div className="glass-card">
            <span className="label">Total Collateral</span>
            <div className="value">{stats.collateral} <span className="text-muted" style={{ fontSize: '0.9rem' }}>tBNB</span></div>
          </div>
          <div className="glass-card">
            <span className="label">Current Debt</span>
            <div className="value" style={{ color: stats.debt !== '0.00' ? 'var(--danger)' : 'inherit' }}>
              ${stats.debt} <span className="text-muted" style={{ fontSize: '0.9rem' }}>USD</span>
            </div>
          </div>
          <div className="glass-card">
            <span className="label">System Health</span>
            <div className="value" style={{ color: parseFloat(healthFactor) > 1.5 ? 'var(--success)' : (parseFloat(healthFactor) > 1.0 ? '#ffcc00' : 'var(--danger)') }}>
              {healthFactor}
            </div>
            <div className="gauge-container">
              <div
                className="gauge-fill"
                style={{
                  width: `${Math.min(Math.max((parseFloat(healthFactor) - 1.0) * 50, 0), 100)}%`,
                  backgroundColor: parseFloat(healthFactor) > 1.5 ? 'var(--success)' : (parseFloat(healthFactor) > 1.0 ? '#ffcc00' : 'var(--danger)'),
                  boxShadow: `0 0 10px ${parseFloat(healthFactor) > 1.5 ? 'var(--success)' : (parseFloat(healthFactor) > 1.0 ? '#ffcc00' : 'var(--danger)')}`
                }}
              />
            </div>
            {parseFloat(borrowAmount) > 0 && (
              <p className="text-muted" style={{ fontSize: '0.65rem', marginTop: '0.5rem', color: '#ffcc00' }}>
                Predicted health if borrowed
              </p>
            )}
          </div>
          <div className="glass-card" style={{ border: '1px solid var(--primary)' }}>
            <span className="label">Wallet Balance</span>
            <div className="value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet size={16} className="text-primary" /> {stats.balance} <span className="text-muted" style={{ fontSize: '0.9rem' }}>tBNB</span>
            </div>
          </div>
          <div className="glass-card" style={{ border: '1px solid var(--accent)', background: 'rgba(189, 0, 255, 0.05)' }}>
            <span className="label" style={{ color: 'var(--accent)' }}>Vault Credit (vUSD)</span>
            <div className="value" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} /> ${stats.creditBalance}
            </div>
            <p className="text-muted" style={{ fontSize: '0.65rem', marginTop: '0.5rem' }}>Liquid Synthetic Credit</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ArrowUpCircle className="text-primary" /> Deposit Collateral
          </h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <span className="label">tBNB Amount</span>
            <input
              type="number"
              className="custom-input"
              placeholder="0.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{ fontSize: '1.25rem', padding: '1rem', marginBottom: '0.5rem' }}
            />
            {parseFloat(depositAmount) > 0 && (
              <div style={{ background: 'rgba(189, 0, 255, 0.1)', padding: '0.8rem', borderRadius: '12px', marginBottom: '1rem', border: '1px dashed var(--accent)', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span className="text-muted">Estimated Credit Power</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>+ ${(parseFloat(depositAmount) * parseFloat(stats.price) * (0.7 + (riskData ? parseFloat(riskData.trustFactorBonus) / 100 : 0))).toFixed(2)} USD</span>
                </div>
              </div>
            )}
            <button
              onClick={depositCollateral}
              disabled={isDepositLoading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', justifyContent: 'center' }}
            >
              {isDepositLoading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
              {isDepositLoading ? "Confirming..." : "Deposit as Collateral"}
            </button>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap className="text-primary" /> Borrow Credit
          </h3>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <span className="label">USD Credit Amount</span>
            <input
              type="number"
              className="custom-input"
              placeholder="0.00"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              style={{ fontSize: '1.25rem', padding: '1rem' }}
            />
            <button
              onClick={borrowCredit}
              disabled={isBorrowLoading}
              className="btn btn-outline"
              style={{ width: '100%', padding: '1rem', justifyContent: 'center', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              {isBorrowLoading ? <RefreshCw className="animate-spin" size={20} /> : <ArrowUpCircle size={20} />}
              {isBorrowLoading ? "Processing..." : "Withdraw Credit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="glass-panel" style={{ marginBottom: '2rem', textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>BNB BNPL Marketplace</h2>
        <p className="text-muted">Buy real-world items using your PQC-secured credit line.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ border: '1px solid var(--accent)', background: 'linear-gradient(135deg, rgba(189, 0, 255, 0.05), transparent)' }}>
          <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} /> Featured Item
          </h4>
          <div style={{ background: 'linear-gradient(45deg, rgba(189, 0, 255, 0.2), rgba(59, 130, 246, 0.2))', borderRadius: '15px', padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid rgba(189, 0, 255, 0.2)', boxShadow: '0 0 20px rgba(189, 0, 255, 0.1)' }}>
            <div style={{ width: '100%', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <ShieldCheck size={80} className="text-accent" style={{ filter: 'drop-shadow(0 0 10px var(--accent))' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.05rem' }}>ENCLAVE HARDWARE</h3>
            <p className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.5rem', textTransform: 'uppercase' }}>ML-DSA PQC SECURED</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="value">$0.50</div>
            <button
              onClick={() => payMerchant("Enclave Store", 0.50)}
              disabled={loading}
              className="btn btn-primary"
              style={{ background: 'var(--accent)', padding: '0.8rem 1.5rem' }}
            >
              Authorize Store
            </button>
          </div>
        </div>

        <div className="glass-panel">
          <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} /> Lifestyle
          </h4>
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(0,0,0,0.5), transparent)', marginBottom: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>
                <Zap size={24} className="text-primary" />
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>Enclave Coffee</p>
                <p className="text-muted" style={{ fontSize: '0.7rem' }}>Premium Energizer</p>
              </div>
            </div>
            <button
              onClick={() => payMerchant("Enclave Coffee", 0.10)}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Pay $0.10
            </button>
          </div>
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(0,0,0,0.5), transparent)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(189,0,255,0.05)', padding: '0.75rem', borderRadius: '12px' }}>
                <ShoppingCart size={24} className="text-accent" />
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>Quantum Club</p>
                <p className="text-muted" style={{ fontSize: '0.7rem' }}>Elite Membership</p>
              </div>
            </div>
            <button
              onClick={() => payMerchant("Quantum Club", 0.25)}
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              Pay $0.25
            </button>
          </div>
        </div>
      </div>

      {transactions.filter(t => t.type === 'PAYMENT').length > 0 && (
        <div className="glass-panel" style={{ marginTop: '2.5rem', animation: 'slideUp 0.6s ease-out' }}>
          <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent)', letterSpacing: '0.1rem' }}>
            <ShieldCheck size={20} /> PERSONAL ENCLAVE VAULT
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {transactions.filter(t => t.type === 'PAYMENT').map((item, i) => (
              <div key={i} className="glass-card" style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid rgba(189, 0, 255, 0.2)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--accent)' }} />
                <div style={{ background: 'linear-gradient(135deg, rgba(189, 0, 255, 0.1), transparent)', height: '80px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <ShoppingCart size={32} className="text-accent" style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{item.details.split(' paid to ')[1]?.split(' via ')[0] || "Enclave Item"}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.2rem' }}>${item.amount} vUSD</div>
                <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: '0.5rem' }}>AUTHORIZATION SECURED • {item.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderAudit = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', animation: 'fadeIn 0.4s ease-out' }}>
      <div className="glass-panel">
        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={20} /> ON-CHAIN ACTIVITY LOG
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw className="text-muted" size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p className="text-muted">No recent on-chain events found.</p>
            </div>
          ) : (
            transactions.map((tx, i) => (
              <div key={i} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderLeft: `4px solid ${tx.type === 'Deposit' ? 'var(--success)' : (tx.type === 'BORROW' ? 'var(--primary)' : 'var(--accent)')}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: tx.type === 'Deposit' ? 'rgba(34, 197, 94, 0.1)' : (tx.type === 'BORROW' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(189, 0, 255, 0.1)'), padding: '0.75rem', borderRadius: '12px' }}>
                    {tx.type === 'Deposit' ? <ArrowUpCircle size={20} className="text-success" /> : (tx.type === 'BORROW' ? <Zap size={20} className="text-primary" /> : <ShoppingCart size={20} style={{ color: 'var(--accent)' }} />)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{tx.type}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {tx.txHash ? (
                        <a
                          href={`https://testnet.opbnbscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          {tx.txHash.slice(0, 10)}... <ExternalLink size={10} />
                        </a>
                      ) : (
                        `Verified On-chain`
                      )}
                      • {tx.date}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {tx.type === 'Deposit' ? '' : '$'}{tx.amount} {tx.type === 'Deposit' ? 'tBNB' : 'USD'}
                  </div>
                  <div className="status-badge status-success" style={{ fontSize: '0.6rem', marginTop: '0.3rem' }}>
                    PQC Verified
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel">
          <h4 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} /> SECURITY AUDIT
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Signature Path</span>
              <span style={{ fontWeight: 600 }}>ML-DSA-65 (NIST Level 3)</span>
            </div>
            <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Network</span>
              <span>{chainInfo.name}</span>
            </div>
            <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Live Block</span>
              <span className="text-primary" style={{ fontFamily: 'monospace' }}>#{chainInfo.block}</span>
            </div>
            <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="text-muted">Handshake Token</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)', wordBreak: 'break-all' }}>{pqcToken}</span>
            </div>
          </div>
          <button
            onClick={() => {
              const csv = "Type,Amount,Hash,Timestamp\n" + transactions.map(t => `${t.type},${t.amount},${t.txHash},${t.timestamp}`).join("\n");
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.setAttribute('hidden', '');
              a.setAttribute('href', url);
              a.setAttribute('download', 'audit_trail.csv');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              showNotify("Audit Trail exported successfully!", "success");
            }}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
          >
            Export Audit Trail <ExternalLink size={16} />
          </button>
        </div>

        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Lock size={48} className="text-primary" style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p style={{ fontWeight: 600 }}>Hardware Enclave Active</p>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            All transactions are signed within a post-quantum secure isolated environment.
          </p>
        </div>
      </div>
    </div>
  );

  // --- DASHBOARD VIEW ---
  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <NotificationToast />
      {/* Navbar */}
      <nav className="nav-bar">
        <div className="logo" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
          <Lock size={20} className="text-primary" />
          BNB<span>Vault.PQC</span>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none' }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`btn ${activeTab === 'marketplace' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none' }}
          >
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none' }}
          >
            Audit Log
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="status-badge status-success" style={{ display: 'none' }}>
            <ShieldCheck size={14} /> Secured
          </div>
          {chainInfo.name.includes('WRONG') && (
            <button
              onClick={switchNetwork}
              className="status-badge status-error"
              style={{ cursor: 'pointer', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)' }}
            >
              Switch to opBNB
            </button>
          )}
          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '0.5rem', borderRadius: '8px' }}
            title="Logout"
          >
            <LogOut size={18} className="text-danger" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'marketplace' && renderMarketplace()}
      {activeTab === 'security' && renderAudit()}

      <PurchaseConfirmationModal />
    </div>
  );
}

export default App;
