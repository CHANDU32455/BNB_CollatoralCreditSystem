import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../../components/common/UI';
import { History, ExternalLink, ShieldCheck, FileText, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

export const AuditLogPage: React.FC = () => {
    const { address } = useAuth();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (address) {
            axios.get(`${BACKEND_URL}/api/activity/history/${address}?limit=100`)
                .then(res => {
                    setHistory(res.data.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [address]);

    return (
        <div className="container">
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/security">
                    <Button variant="outline" style={{ padding: '0.6rem' }}>
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 style={{ fontSize: '2rem' }}>Full Audit <span style={{ color: 'var(--primary)' }}>History</span></h1>
                    <p className="text-muted">Complete records of your vault activity on opBNB & Greenfield.</p>
                </div>
            </div>

            <Card style={{ minHeight: '600px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                                <History size={40} className="text-primary" />
                            </div>
                            <p className="text-muted">Retrieving Immutable Records...</p>
                        </div>
                    ) : history.length > 0 ? (
                        history.map((item, idx) => {
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
                                        color: typeColor
                                    }}>
                                        {isError ? <ShieldAlert size={20} /> : (isSecurity ? <ShieldCheck size={20} /> : <FileText size={20} />)}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: typeColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {item.type}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.5',
                                            wordBreak: 'break-all',
                                            fontFamily: isError ? 'monospace' : 'inherit'
                                        }}>
                                            {item.details}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                                        {item.txHash && (
                                            <a
                                                href={`https://opbnb-testnet.bscscan.com/tx/${item.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-proof"
                                                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                            >
                                                Explorer <ExternalLink size={12} />
                                            </a>
                                        )}
                                        {item.greenfieldCid && (
                                            <a
                                                href={item.greenfieldCid.startsWith('http') ? item.greenfieldCid : `https://greenfield-sp.testnet.bnbchain.org/view/${item.greenfieldCid}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-proof"
                                            >
                                                {item.greenfieldCid.startsWith('http') ? 'Proof' : 'Greenfield'} <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>

                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                            <p>No activity records found for this account.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
