import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../hooks/useStats';
import { Card, Button } from '../../components/common/UI';
import { ShieldCheck, History, ExternalLink, ArrowRightLeft, FileText, Database, ShieldAlert, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

import { Link } from 'react-router-dom';

export const SecurityPage: React.FC = () => {
    const { address } = useAuth();
    const { legacyCollateral } = useStats(address);
    const [history, setHistory] = useState<any[]>([]);
    const [mandate, setMandate] = useState<{ hasMandate: boolean; cid: string | null } | null>(null);

    useEffect(() => {
        if (address) {
            axios.get(`${BACKEND_URL}/api/activity/history/${address}?limit=5`)
                .then(res => setHistory(res.data.data))
                .catch(console.error);

            axios.get(`${BACKEND_URL}/api/vault/mandate-status/${address}`)
                .then(res => setMandate(res.data))
                .catch(console.error);
        }
    }, [address]);


    return (
        <div className="container">
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Security & <span style={{ color: 'var(--success)' }}>Audits</span></h1>
                <p className="text-muted">Transparency is the core of BNB Vault. All actions are anchored to BNB Greenfield.</p>
            </div>

            <div className="dashboard-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {parseFloat(legacyCollateral) > 0 && (
                        <Card style={{ border: '2px solid var(--primary)', background: 'rgba(243, 186, 47, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <ArrowRightLeft size={20} /> Migration Required
                                    </h3>
                                    <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                                        You have {legacyCollateral} tBNB in a legacy vault. Move to PQC Vault for 2x security.
                                    </p>
                                </div>
                                <Button variant="primary">Migrate Funds</Button>
                            </div>
                        </Card>
                    )}

                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <History size={20} className="text-primary" /> Immutable Audit Trail
                            </h3>
                            <Link to="/security/history" style={{ textDecoration: 'none' }}>
                                <Button variant="outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                                    See Full History <ChevronRight size={14} />
                                </Button>
                            </Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {history.length > 0 ? history.map((item, idx) => {
                                const type = item.type.toLowerCase();
                                const isSecurity = type.includes('pqc') || type.includes('login');
                                const isError = type.includes('error') || type.includes('fail');

                                const typeColor = isError ? 'var(--danger)' : (isSecurity ? 'var(--accent)' : 'var(--primary)');
                                const typeBg = isError ? 'rgba(239, 68, 68, 0.1)' : (isSecurity ? 'rgba(189, 0, 255, 0.1)' : 'rgba(243, 186, 47, 0.1)');

                                return (
                                    <div key={idx} className="audit-tile" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1.25rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)',
                                        borderLeft: `4px solid ${typeColor}`,
                                        gap: '1.25rem',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            background: typeBg,
                                            display: 'flex',
                                            flexShrink: 0,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: typeColor,
                                            boxShadow: `0 4px 12px ${typeBg}`
                                        }}>
                                            {isError ? <ShieldAlert size={20} /> : (isSecurity ? <ShieldCheck size={20} /> : <FileText size={20} />)}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: typeColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {item.type}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="audit-details" style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--text-secondary)',
                                                lineHeight: '1.4',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                wordBreak: 'break-all',
                                                fontFamily: isError ? 'monospace' : 'inherit',
                                                opacity: isError ? 0.8 : 1,
                                                maxWidth: '100%'
                                            }} title={item.details}>
                                                {item.details}
                                            </div>
                                        </div>

                                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ textAlign: 'right', display: 'none', flexDirection: 'column' }}>
                                                {/* Desktop view time/date hidden for ultra-clean look, using inline time above */}
                                            </div>

                                            {item.greenfieldCid ? (
                                                <a
                                                    href={`https://greenfield-sp.testnet.bnbchain.org/view/${item.greenfieldCid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-proof"
                                                >
                                                    View Proof <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <div className="status-secured">
                                                    <span className="dot"></span> SECURED
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.5 }}>
                                    <Database size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                                    <p>Waiting for Greenfield Sync...</p>
                                </div>
                            )}
                        </div>
                    </Card>


                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <Card style={{ border: '1px solid var(--success)', background: 'rgba(34, 197, 94, 0.05)' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <ShieldCheck size={20} className="text-success" /> PQC Mandate
                        </h3>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            Your account is protected by <span style={{ color: 'var(--success)' }}>ML-DSA-65</span> signatures.
                            All liquidations and high-value transactions require a PQC-biometric session.
                        </div>
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Database size={24} className={mandate?.hasMandate ? "text-success" : "text-muted"} />
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                    {mandate?.hasMandate ? 'Signed Agreement' : 'Storage Provider'}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    {mandate?.hasMandate ? (
                                        <a
                                            href={`https://greenfield-sp.testnet.bnbchain.org/view/${mandate.cid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--success)', textDecoration: 'none' }}
                                        >
                                            CID: {mandate.cid?.slice(0, 15)}... <ExternalLink size={10} />
                                        </a>
                                    ) : 'Greenfield SP-1 (Pending Signing)'}
                                </div>
                            </div>
                        </div>

                    </Card>

                    <Card>
                        <h3 style={{ marginBottom: '1rem' }}>Post-Quantum Security</h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                            Traditional wallets use ECDSA, which is vulnerable to quantum compute.
                            BNB Vault wraps your wallet in a PQC shield using NIST-approved module-lattice algorithms.
                        </p>
                        <Button variant="outline" grow style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
                            Learn about NIST Standards
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};
