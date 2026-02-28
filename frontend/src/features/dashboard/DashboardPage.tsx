import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../hooks/useStats';
import { useBlockchain } from '../../hooks/useBlockchain';
import { Card, Button } from '../../components/common/UI';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    ShieldCheck,
    ChevronRight,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL, BUCKET_NAME } from '../../utils/constants';

export const DashboardPage: React.FC = () => {
    const { address } = useAuth();
    const { stats, riskData, isSyncing, updateStats, chainInfo } = useStats(address);
    const { depositCollateral, borrowCredit, repayDebt, withdrawCollateral } = useBlockchain(address);

    const [depositAmount, setDepositAmount] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [repayAmount, setRepayAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const [loading, setLoading] = useState(false);
    const [borrowLoading, setBorrowLoading] = useState(false);
    const [repayLoading, setRepayLoading] = useState(false);
    const [withdrawLoading, setWithdrawLoading] = useState(false);

    const [status, setStatus] = useState<{ msg: string, isError: boolean } | null>(null);
    const [agreeMandate, setAgreeMandate] = useState(false);
    const [mandateInfo, setMandateInfo] = useState<{ hasMandate: boolean; cid: string | null } | null>(null);

    React.useEffect(() => {
        if (address) {
            axios.get(`${BACKEND_URL}/api/vault/mandate-status/${address}`)
                .then(res => setMandateInfo(res.data))
                .catch(err => console.error("Error fetching mandate:", err));
        }
    }, [address]);

    const showStatus = (msg: string, isError: boolean = false) => {
        setStatus({ msg, isError });
        setTimeout(() => setStatus(null), 4000);
    };

    const handleRepay = async () => {
        if (!repayAmount || parseFloat(repayAmount) <= 0) {
            showStatus("Please enter a valid amount to repay.", true);
            return;
        }

        // Prevent over-repaying
        if (parseFloat(repayAmount) > parseFloat(stats.debt)) {
            showStatus(`Cannot repay more than your debt ($${stats.debt}).`, true);
            return;
        }

        // Check if user has enough vUSD tokens
        if (parseFloat(repayAmount) > parseFloat(stats.creditBalance)) {
            showStatus(`Insufficient vUSD balance! You need $${repayAmount} but only have $${stats.creditBalance}.`, true);
            return;
        }

        setRepayLoading(true);
        try {
            await repayDebt(repayAmount, (msg) => showStatus(msg));
            setRepayAmount('');
            showStatus("Debt repaid! vUSD balance updated.");
            updateStats();
        } catch (e: any) {
            if (e.code === 4001 || e.message?.includes('rejected')) {
                showStatus("Repayment canceled.", false);
            } else {
                console.error(e);
                showStatus("Repayment failed. Do you have enough vUSD?", true);
            }
        } finally {
            setRepayLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
            showStatus("Please enter a valid amount to withdraw.", true);
            return;
        }

        // Robust debt check (handles tiny dust)
        if (parseFloat(stats.debt) > 0.000001) {
            showStatus("Please settle your outstanding vUSD debt before recovering your collateral. 🛡️", true);
            return;
        }

        // Prevent withdrawing more than staked
        if (parseFloat(withdrawAmount) > parseFloat(stats.collateral)) {
            showStatus(`Cannot withdraw more than your staked amount (${stats.collateral} tBNB).`, true);
            return;
        }


        setWithdrawLoading(true);
        try {
            await withdrawCollateral(withdrawAmount);
            setWithdrawAmount('');
            showStatus("Collateral withdrawn! tBNB restored to wallet.");
            updateStats();
        } catch (e: any) {
            if (e.code === 4001 || e.message?.includes('rejected')) {
                showStatus("Withdrawal canceled.", false);
            } else {
                console.error(e);
                // More nuanced error message
                const isDebtError = e.message?.toLowerCase().includes("repay") || parseFloat(stats.debt) > 0;
                showStatus(isDebtError
                    ? "Withdrawal Denied: Secure your debt first! 🛡️"
                    : "Withdrawal failed. Check collateral balance & Health Factor!", true);
            }
        } finally {
            setWithdrawLoading(false);
        }
    };




    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) {
            showStatus("Please enter a valid tBNB amount.", true);
            return;
        }

        // PQC Mandate Enforcement
        if (mandateInfo && !mandateInfo.hasMandate) {
            if (!agreeMandate) {
                showStatus("Please agree to the PQC Liquidation Mandate to proceed.", true);
                return;
            }

            setLoading(true);
            try {
                showStatus("Generating PQC Mandate & Anchoring to Greenfield...");
                await axios.post(`${BACKEND_URL}/api/vault/sign-agreement`, {
                    userAddress: address,
                    loanDetails: { type: "ONBOARDING_DEPOSIT", amount: depositAmount }
                });
                showStatus("Mandate Signed! Now securing collateral...");
            } catch (err) {
                console.error(err);
                showStatus("PQC Signing failed. Please try again.", true);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        try {
            await depositCollateral(depositAmount);
            setDepositAmount('');
            showStatus("Deposit successful! Your collateral is now secured on opBNB.");
            updateStats();
            // Refresh mandate status
            const newMandate = await axios.get(`${BACKEND_URL}/api/vault/mandate-status/${address}`);
            setMandateInfo(newMandate.data);
        } catch (e: any) {
            if (e.code === 4001 || e.message?.includes('rejected')) {
                showStatus("Transaction canceled.", false);
            } else {
                console.error(e);
                showStatus("Deposit failed. Check your wallet balance.", true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBorrow = async () => {
        if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
            showStatus("Please enter a valid vUSD amount.", true);
            return;
        }

        // Prevent borrowing more than capacity
        if (parseFloat(borrowAmount) > parseFloat(stats.borrowCapacity)) {
            showStatus("Insufficient Borrow Capacity!", true);
            return;
        }

        setBorrowLoading(true);
        try {
            await borrowCredit(borrowAmount);
            setBorrowAmount('');
            showStatus("Credit successfully issued! Check your vUSD balance.");
            updateStats();
        } catch (e: any) {
            if (e.code === 4001 || e.message?.includes('rejected')) {
                showStatus("Borrow request canceled.", false);
            } else {
                console.error(e);
                showStatus("Credit issuance failed. Health Factor risk?", true);
            }
        } finally {
            setBorrowLoading(false);
        }
    };




    const healthFactor = (() => {
        const colUsed = parseFloat(stats.collateral);
        const debtUsed = parseFloat(stats.debt);
        const price = parseFloat(stats.price);
        const bonusLTV = riskData ? parseFloat(riskData.trustFactorBonus) / 100 : 0;

        if (debtUsed <= 0.0001) return 100;
        const hf = (colUsed * price * (0.7 + bonusLTV)) / debtUsed;
        return Math.min(hf, 99.99);
    })();

    const hfColor = healthFactor > 2 ? 'var(--success)' : (healthFactor > 1.2 ? 'var(--primary)' : 'var(--danger)');

    return (
        <div className="container" style={{ paddingBottom: '5rem', position: 'relative' }}>
            {/* Status Messenger */}
            {status && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 1000,
                    minWidth: '320px',
                    pointerEvents: 'none'
                }}>
                    <Card style={{
                        background: status.isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(243, 186, 47, 0.9)',
                        color: status.isError ? '#fff' : '#000',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        padding: '1.25rem 2rem',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderLeft: `5px solid ${status.isError ? '#fff' : 'var(--primary)'}`
                    }}>
                        {status.msg}
                    </Card>
                </div>
            )}


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Financial <span style={{ color: 'var(--primary)' }}>Snapshot</span></h1>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                            {chainInfo.name} • Block {chainInfo.block}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Syncing Chain State...' : 'Live Price: $' + stats.price}
                        </span>
                    </div>
                </div>

                <Card glass={false} style={{ padding: '0.75rem 1.5rem', border: '1px solid ' + hfColor, background: hfColor + '11' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: hfColor }}>Health Factor</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: hfColor }}>{healthFactor.toFixed(2)}</div>
                </Card>
            </div>

            <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="stat-grid">
                        <Card className="glass-card">
                            <span className="label">Total Collateral</span>
                            <div className="value">{stats.collateral} <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>tBNB</span></div>
                            <div className="text-muted">≈ ${(parseFloat(stats.collateral) * parseFloat(stats.price)).toFixed(2)} USD</div>
                        </Card>
                        <Card className="glass-card">
                            <span className="label">Active Debt</span>
                            <div className="value" style={{ color: parseFloat(stats.debt) > 0 ? 'var(--danger)' : 'inherit' }}>${stats.debt} <span style={{ fontSize: '0.9rem' }}>vUSD</span></div>
                            <div className="text-muted">Interest: 0%</div>
                        </Card>
                        <Card className="glass-card">
                            <span className="label">Borrow Capacity</span>
                            <div className="value" style={{ color: 'var(--success)' }}>${stats.borrowCapacity} <span style={{ fontSize: '0.9rem' }}>USD</span></div>
                            <div className="text-muted">LTV: {((0.7 + (riskData?.trustFactorBonus / 100 || 0)) * 100).toFixed(0)}%</div>
                        </Card>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <Card>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <ArrowUpCircle size={20} className="text-primary" /> Deposit Collateral
                            </h3>
                            <div className="custom-input-group">
                                <input
                                    type="number"
                                    min="0"
                                    className="custom-input"
                                    placeholder="0.00 tBNB"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span className="text-muted">Available: {stats.balance} tBNB</span>
                                    <span style={{ color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }} onClick={() => setDepositAmount(Math.max(0, parseFloat(stats.balance)).toString())}>MAX</span>
                                </div>

                                <div className="gauge-container" style={{ marginBottom: '0.5rem' }}>
                                    <div
                                        className="gauge-fill"
                                        style={{
                                            width: `${Math.min((parseFloat(depositAmount) || 0) / (parseFloat(stats.balance) || 1) * 100, 100)}%`,
                                            background: 'var(--primary)'
                                        }}
                                    />
                                </div>

                                <div style={{
                                    background: 'rgba(243, 186, 47, 0.05)',
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: '1px dashed var(--glow-primary)',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                                        +${((parseFloat(depositAmount) || 0) * parseFloat(stats.price) * (0.7 + (riskData?.trustFactorBonus / 100 || 0))).toFixed(2)} vUSD
                                    </span>
                                </div>

                                {mandateInfo && !mandateInfo.hasMandate && (
                                    <div style={{
                                        marginBottom: '1.5rem',
                                        display: 'flex',
                                        gap: '0.75rem',
                                        background: 'rgba(189, 0, 255, 0.05)',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--accent)',
                                        alignItems: 'flex-start'
                                    }}>
                                        <input
                                            type="checkbox"
                                            id="mandate-check"
                                            checked={agreeMandate}
                                            onChange={(e) => setAgreeMandate(e.target.checked)}
                                            style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="mandate-check" style={{ fontSize: '0.75rem', lineHeight: '1.4', cursor: 'pointer' }}>
                                            I agree to the <b>PQC Liquidation Mandate</b>. I grant the protocol step-in rights to preserve solvency, with tamper-proof auditing on <b>BNB Greenfield</b>.
                                        </label>
                                    </div>
                                )}

                                {mandateInfo?.hasMandate && (
                                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                                        <div className="status-badge" style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                                            <ShieldCheck size={12} style={{ marginRight: '4px' }} />
                                            Mandate Secured:
                                            <a
                                                href={mandateInfo.cid?.startsWith('http') ? mandateInfo.cid : `https://testnet.dcellar.io/object/${BUCKET_NAME}/${mandateInfo.cid}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'inherit', textDecoration: 'underline', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                            >
                                                View Proof <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button grow onClick={handleDeposit} isLoading={loading}>
                                Lock Collateral
                            </Button>
                        </Card>

                        <Card>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <ArrowDownCircle size={20} style={{ color: 'var(--success)' }} /> Get Credit
                            </h3>
                            <div className="custom-input-group">
                                <input
                                    type="number"
                                    min="0"
                                    className="custom-input"
                                    placeholder="0.00 vUSD"
                                    value={borrowAmount}
                                    onChange={(e) => setBorrowAmount(e.target.value)}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span className="text-muted">Limit: ${stats.borrowCapacity}</span>
                                    <span style={{ color: 'var(--success)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }} onClick={() => setBorrowAmount(Math.max(0, parseFloat(stats.borrowCapacity)).toString())}>MAX</span>
                                </div>

                                <div className="gauge-container" style={{ marginBottom: '1.5rem' }}>
                                    <div
                                        className="gauge-fill"
                                        style={{
                                            width: `${Math.min((parseFloat(borrowAmount) || 0) / (parseFloat(stats.borrowCapacity) || 1) * 100, 100)}%`,
                                            background: 'var(--success)',
                                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)'
                                        }}
                                    />
                                </div>
                            </div>
                            <Button grow variant="primary" style={{ background: 'var(--success)', color: '#000' }} onClick={handleBorrow} isLoading={borrowLoading}>
                                Issue Credit
                            </Button>
                        </Card>
                    </div>

                    <Card style={{ border: '1px solid var(--accent)', background: 'rgba(189, 0, 255, 0.05)' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <RefreshCw size={20} style={{ color: 'var(--accent)' }} /> Manage Vault (Repay / Recover)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div className="custom-input-group">
                                <label className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>Repay Debt</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={stats.debt}
                                    className="custom-input"
                                    placeholder="Amount vUSD"
                                    value={repayAmount}
                                    onChange={(e) => setRepayAmount(e.target.value)}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span className="text-muted">Debt: ${stats.debt}</span>
                                    <span style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }} onClick={() => setRepayAmount(stats.debt)}>MAX</span>
                                </div>
                                <Button grow variant="accent" onClick={handleRepay} isLoading={repayLoading}>
                                    Repay vUSD
                                </Button>
                            </div>

                            <div className="custom-input-group">
                                <label className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem', display: 'block' }}>Withdraw Collateral</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={stats.collateral}
                                    className="custom-input"
                                    placeholder="Amount tBNB"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <span className="text-muted">Staked: {stats.collateral} tBNB</span>
                                    <span style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }} onClick={() => setWithdrawAmount(stats.collateral)}>MAX</span>
                                </div>
                                <Button grow variant="outline" onClick={handleWithdraw} isLoading={withdrawLoading}>
                                    Recover Crypto
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card style={{ border: '1px solid var(--accent)', background: 'rgba(189, 0, 255, 0.05)' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <ShieldCheck size={20} style={{ color: 'var(--accent)' }} /> Trust Score
                        </h3>
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)' }}>{riskData?.pqcTrustScore || '850'}</div>
                            <div className="text-muted">PQC Secured Identity</div>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span className="text-muted">LTV Bonus</span>
                                <span style={{ color: 'var(--success)' }}>+{riskData?.trustFactorBonus || '5'}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">BNB Reputation</span>
                                <span>Level {riskData?.reputationLevel || '4'}</span>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 style={{ marginBottom: '1.5rem' }}>Wallet Overview</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">tBNB Balance</span>
                                <span style={{ fontWeight: 600 }}>{stats.balance}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">vUSD Balance</span>
                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{stats.creditBalance}</span>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                            <a
                                href={`https://testnet.opbnbscan.com/address/${address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                <Button variant="outline" grow style={{ fontSize: '0.8rem' }}>
                                    View on opBNB Scan <ChevronRight size={14} />
                                </Button>
                            </a>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

