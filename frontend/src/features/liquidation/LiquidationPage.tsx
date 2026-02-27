import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../hooks/useStats';
import { Card, Button } from '../../components/common/UI';
import { Activity, Zap, ShieldAlert, TrendingDown, TrendingUp, ExternalLink, Clock } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export const LiquidationPage: React.FC = () => {
    const { address } = useAuth();
    const { updateStats } = useStats(address);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ msg: string, isError: boolean } | null>(null);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/liquidation/recent`);
            setRecentLogs(res.data);
        } catch (e) {
            console.error("Failed to fetch liquidation logs", e);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, []);

    const showStatus = (msg: string, isError: boolean = false) => {
        setStatus({ msg, isError });
        setTimeout(() => setStatus(null), 4000);
    };

    const simulateCrash = async () => {
        setLoading(true);
        try {
            await axios.post(`${BACKEND_URL}/api/simulate/crash`);
            showStatus("CRASH SIMULATED: Global BNB price dropped to $200", true);
            updateStats();
            setTimeout(fetchLogs, 5000); // Wait for bot to react
        } catch (e: any) {
            console.error(e);
            showStatus("Simulation failed. Check backend connection.", true);
        } finally {
            setLoading(false);
        }
    };

    const simulateRecovery = async () => {
        setLoading(true);
        try {
            await axios.post(`${BACKEND_URL}/api/simulate/recover`);
            showStatus("MARKET RECOVERED: Pricing oracle resynced to Binance Live!");
            updateStats();
        } catch (e) {
            console.error(e);
            showStatus("Recovery failed.", true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ position: 'relative' }}>
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
                        background: status.isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                        color: '#fff',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        padding: '1.25rem 2rem',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderLeft: '5px solid #fff'
                    }}>
                        {status.msg}
                    </Card>
                </div>
            )}

            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Guardian <span style={{ color: 'var(--danger)' }}>Control Panel</span></h1>
                <p className="text-muted">Monitor protocol health and simulate market conditions to verify Guardian Bot performance.</p>
            </div>

            <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--danger)' }}>
                            <ShieldAlert size={20} /> Danger Zone: Market Simulation
                        </h3>
                        <p className="text-muted" style={{ margin: '1rem 0' }}>
                            These actions affect the global oracle prices on the testnet. When HF drops &lt; 1.0, the Guardian Bot will verify PQC mandates on Greenfield and dissolve debts automatically.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Button variant="outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={simulateCrash} isLoading={loading}>
                                <TrendingDown size={18} /> Simulate Market Crash ($200)
                            </Button>
                            <Button variant="outline" style={{ borderColor: 'var(--success)', color: 'var(--success)' }} onClick={simulateRecovery} isLoading={loading}>
                                <TrendingUp size={18} /> Restore Market Price
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Activity size={20} className="text-primary" /> Active Guardian Feed
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recentLogs.length > 0 ? (
                                recentLogs.map((log, i) => (
                                    <div key={i} style={{
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        borderLeft: '4px solid var(--danger)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.8rem' }}>AUTO-DISSOLVE</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>{log.details}</div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            {log.txHash && (
                                                <a href={`https://opbnb-testnet.bscscan.com/tx/${log.txHash}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                                    Explorer <ExternalLink size={10} />
                                                </a>
                                            )}
                                            {log.greenfieldCid && (
                                                <a href={log.greenfieldCid.startsWith('http') ? log.greenfieldCid : `https://greenfield-sp.testnet.bnbchain.org/view/${log.greenfieldCid}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none' }}>
                                                    Greenfield Proof <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                                    <Zap size={24} style={{ marginBottom: '0.5rem' }} />
                                    <p>No recent liquidations. System health is nominal.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div>
                    <Card style={{ height: '100%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Guardian Logic</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Detection Phase</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Continuous polling of all opBNB vaults via Price Oracle data.</div>
                            </div>
                            <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Verification Phase</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Bot cross-checks "Step-In Rights" mandate signature on BNB Greenfield.</div>
                            </div>
                            <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '1rem' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Execution Phase</div>
                                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Atomic `liquidate()` call on opBNB to secure protocol solvency.</div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(243, 186, 47, 0.05)', borderRadius: '12px', border: '1px dashed var(--primary)' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', margin: 0 }}>
                                    <strong>Note:</strong> In this demo, the Guardian Bot is currently running on the server. In production, this would be a decentralized network of Keepers.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

