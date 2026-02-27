import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../hooks/useStats';
import { Card, Button } from '../../components/common/UI';
import { ExternalLink, Store } from 'lucide-react';
import { useBlockchain } from '../../hooks/useBlockchain';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/constants';

const ITEMS = [
    { id: 1, name: 'Quantum Shield V1', price: 0.99, category: 'Hardware', image: '🛡️', description: 'ML-DSA hardware signer for high-value vaults.' },
    { id: 2, name: 'PQC VIP Access', price: 0.49, category: 'Service', image: '🎟️', description: '1-month priority session for biometric signing.' },
    { id: 3, name: 'Vault Guardian Pro', price: 0.85, category: 'Security', image: '🤖', description: 'Auto-rebalancing bot for liquidation protection.' },
    { id: 4, name: 'BNB Zen Hoodie', price: 0.25, category: 'Merch', image: '👕', description: 'Exclusive opBNB developer apparel.' },
    { id: 5, name: 'Secure Recovery Key', price: 0.75, category: 'Backup', image: '🔑', description: 'PQC-encrypted physical recovery seed.' },
    { id: 6, name: 'Satellite Node Lease', price: 0.10, category: 'Network', image: '🛰️', description: '24h dedicated Greenfield storage node.' },
];

export const MarketplacePage: React.FC = () => {
    const { address } = useAuth();
    const { stats, updateStats } = useStats(address);
    const { borrowCredit } = useBlockchain(address);
    const [loading, setLoading] = useState<number | null>(null);
    const [status, setStatus] = useState<{ msg: string; isError: boolean } | null>(null);

    const showStatus = (msg: string, isError: boolean = false) => {
        setStatus({ msg, isError });
        setTimeout(() => setStatus(null), 4000);
    };

    const handlePurchase = async (item: typeof ITEMS[0]) => {
        const itemPriceUSD = item.price;
        const currentBalance = parseFloat(stats.creditBalance);
        const capacity = parseFloat(stats.borrowCapacity);

        setLoading(item.id);

        try {
            // Logic: One-Click Buy
            // 1. If balance is enough, buy directly.
            // 2. If balance not enough, check if capacity allows auto-borrow.

            if (currentBalance < itemPriceUSD) {
                const needed = itemPriceUSD - currentBalance;
                if (needed <= capacity) {
                    showStatus(`Auto-Borrowing $${needed.toFixed(2)} vUSD to complete purchase...`);
                    await borrowCredit(needed.toString());
                    await updateStats();
                } else {
                    showStatus("Insufficient Credit Power for this purchase.", true);
                    setLoading(null);
                    return;
                }
            }

            // Simulate PQC Signing
            await new Promise(r => setTimeout(r, 1500));

            const response = await axios.post(`${BACKEND_URL}/api/marketplace/purchase`, {
                address,
                itemId: item.id,
                price: itemPriceUSD
            });

            if (response.data.success) {
                showStatus(`Purchase Successful: ${item.name}! 🚀`);
                updateStats();
            }
        } catch (error) {
            console.error(error);
            showStatus("Transaction failed or canceled.", true);
        } finally {
            setLoading(null);
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
                        background: status.isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(189, 0, 255, 0.9)',
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
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>PQC Payment <span style={{ color: 'var(--accent)' }}>Bridge</span></h1>
                <p className="text-muted">Spend your collateral-backed vUSD credit instantly with Post-Quantum Security.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {ITEMS.map(item => {
                    const canAfford = parseFloat(stats.creditBalance) >= item.price || (parseFloat(stats.creditBalance) + parseFloat(stats.borrowCapacity) >= item.price);

                    return (
                        <Card key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '2.5rem' }}>{item.image}</div>
                                <div className="status-badge" style={{ background: 'rgba(189, 0, 255, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                                    {item.category}
                                </div>
                            </div>

                            <div>
                                <h3 style={{ margin: '0.5rem 0' }}>{item.name}</h3>
                                <p className="text-muted" style={{ fontSize: '0.9rem' }}>{item.description}</p>
                            </div>

                            <div style={{ marginTop: 'auto' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>
                                    ${item.price.toFixed(2)} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>vUSD</span>
                                </div>
                                <Button
                                    variant="accent"
                                    grow
                                    isLoading={loading === item.id}
                                    disabled={!canAfford}
                                    onClick={() => handlePurchase(item)}
                                >
                                    {parseFloat(stats.creditBalance) < item.price ? 'BNPL (Auto-Borrow)' : 'Buy Now'}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>



            <Card style={{ marginTop: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '15px' }}>
                        <Store size={32} className="text-muted" />
                    </div>
                    <div>
                        <h3>Want to accept vUSD?</h3>
                        <p className="text-muted">Integrate the BNB Vault PQC SDK into your store in minutes.</p>
                    </div>
                </div>
                <Button variant="outline">
                    Developer Docs <ExternalLink size={14} />
                </Button>
            </Card>
        </div>
    );
};
