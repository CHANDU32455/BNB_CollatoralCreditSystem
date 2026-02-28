import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../hooks/useStats';
import { Card, Button } from '../../components/common/UI';
import {
    User,
    Wallet,
    ShieldCheck,
    TrendingUp,
    Award,
    ExternalLink,
    LogOut,
    Lock,
    Globe
} from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL, BUCKET_NAME } from '../../utils/constants';

export const ProfilePage: React.FC = () => {
    const { address, user, logout } = useAuth();
    const { stats, riskData } = useStats(address);
    const [mandate, setMandate] = useState<{ hasMandate: boolean, cid: string | null }>({ hasMandate: false, cid: null });

    useEffect(() => {
        if (address) {
            axios.get(`${BACKEND_URL}/api/vault/mandate-status/${address}`)
                .then(res => setMandate(res.data))
                .catch(err => console.error(err));
        }
    }, [address]);

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>User <span style={{ color: 'var(--primary)' }}>Identity</span></h1>
                <p className="text-muted">Managed via QidCloud Post-Quantum Enclave & opBNB.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Left Column: Personal Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'var(--primary-gradient)',
                            margin: '0 auto 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 30px var(--glow-primary)'
                        }}>
                            <User size={48} color="#000" />
                        </div>
                        <h2 style={{ marginBottom: '0.25rem' }}>{user?.username || 'PQC Secured User'}</h2>
                        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>{user?.email || 'email@vault.secured'}</p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            textAlign: 'left',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <ShieldCheck size={18} className="text-accent" />
                                <span style={{ fontSize: '0.85rem' }}>ML-DSA-65 Biometrics</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Lock size={18} className="text-primary" />
                                <span style={{ fontSize: '0.85rem' }}>E2EE Enclave Storage</span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            style={{ marginTop: '2.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            grow
                            onClick={logout}
                        >
                            <LogOut size={18} /> Logout Session
                        </Button>
                    </Card>

                    <Card>
                        <h3 style={{ marginBottom: '1.5rem' }}>Security Status</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">PQC Authentication</span>
                                <span className="badge badge-success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>VERIFIED</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted">Greenfield Mandate</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span className={`badge ${mandate.hasMandate ? 'badge-success' : 'badge-warning'}`} style={{
                                        background: mandate.hasMandate ? 'rgba(34, 197, 94, 0.1)' : 'rgba(243, 186, 47, 0.1)',
                                        color: mandate.hasMandate ? 'var(--success)' : 'var(--primary)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700
                                    }}>
                                        {mandate.hasMandate ? (
                                            <a
                                                href={mandate.cid?.startsWith('http') ? mandate.cid : `https://testnet.dcellar.io/object/${BUCKET_NAME}/${mandate.cid}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'inherit', textDecoration: 'none' }}
                                            >
                                                SIGNED <ExternalLink size={10} style={{ marginLeft: '4px' }} />
                                            </a>
                                        ) : 'MISSING'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Web3 Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Wallet size={20} className="text-primary" /> Web3 Identity
                        </h3>
                        <div style={{
                            padding: '1.25rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            wordBreak: 'break-all',
                            marginBottom: '1.5rem'
                        }}>
                            {address}
                        </div>
                        <a
                            href={`https://testnet.opbnbscan.com/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            <Button variant="outline" grow>
                                View on opBNB Scan <ExternalLink size={16} />
                            </Button>
                        </a>
                    </Card>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <Card>
                            <Award size={24} className="text-primary" style={{ marginBottom: '1rem' }} />
                            <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Trust Factor</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{riskData?.trustFactorBonus || '1.00'}%</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Protocol Reliability Score</div>
                        </Card>
                        <Card>
                            <TrendingUp size={24} className="text-accent" style={{ marginBottom: '1rem' }} />
                            <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Active Credit</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>${stats.debt}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total vUSD Outstanding</div>
                        </Card>
                    </div>

                    <Card>
                        <h3 style={{ marginBottom: '1.5rem' }}>Ecosystem Contributions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <Globe size={20} className="text-muted" />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Regional Node: Mumbai</div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Fastest connection via AWS Mumbai Edge.</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <ShieldCheck size={20} className="text-success" />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>PQC Safeguard (NIST compliant)</div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>Your wallet is quantum-proofed.</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
