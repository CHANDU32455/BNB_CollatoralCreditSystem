import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { QidSignInButton } from '@qidcloud/sdk';
import { Lock, Smartphone, ShieldCheck, ChevronRight, Fingerprint, Cpu, Globe } from 'lucide-react';
import { Button, Card } from '../../components/common/UI';
import { motion, AnimatePresence } from 'framer-motion';

export const LoginPage: React.FC = () => {
    const { address, pqcSecured, connectWallet, onPqcSuccess, finalizeLogin, loading, qid } = useAuth();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d12 100%)',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Animated Background Elements */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.15,
                zIndex: 0,
                backgroundSize: '40px 40px',
                backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)'
            }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1.2 }}
                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                style={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-10%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
                    filter: 'blur(100px)',
                    zIndex: 0
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.4, scale: 1.1 }}
                transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', delay: 2 }}
                style={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    zIndex: 0
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ zIndex: 1, width: '100%', maxWidth: '900px', padding: '2rem' }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', alignItems: 'center' }}>

                    {/* Left Side: Branding & Info */}
                    <div style={{ color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{
                                background: 'var(--primary)',
                                padding: '0.75rem',
                                borderRadius: '15px',
                                boxShadow: '0 0 30px var(--glow-primary)'
                            }}>
                                <Lock size={32} color="#000" />
                            </div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                                BNB<span style={{ color: 'var(--primary)' }}>Vault.PQC</span>
                            </h1>
                        </div>

                        <h2 style={{ fontSize: '3rem', lineHeight: 1.1, marginBottom: '1.5rem', fontWeight: 800 }}>
                            Liquid Credit. <br />
                            <span style={{ color: 'var(--accent)' }}>Post-Quantum</span> Security.
                        </h2>

                        <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '450px' }}>
                            The next generation of collateralized credit. Secured by ML-DSA biometrics and deployed on the ultra-fast opBNB network.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <Globe size={20} className="text-primary" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>opBNB Mainnet-Ready</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <Cpu size={20} className="text-accent" />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enclave Execution</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Auth Card */}
                    <Card style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '2.5rem',
                        borderRadius: '30px',
                        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '4px',
                            background: 'linear-gradient(90deg, transparent, var(--primary), transparent)'
                        }} />

                        <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>Identity Verification</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Step 1: Wallet */}
                            <div style={{
                                padding: '1.25rem',
                                background: address ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)',
                                borderRadius: '18px',
                                border: `1px solid ${address ? 'var(--success)' : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.3s'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Smartphone size={20} style={{ color: address ? 'var(--success)' : 'var(--text-secondary)' }} />
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Blockchain Wallet</span>
                                    </div>
                                    {address && <ShieldCheck size={18} className="text-success" />}
                                </div>
                                {!address ? (
                                    <Button grow variant="primary" onClick={connectWallet} isLoading={loading}>
                                        Connect MetaMask
                                    </Button>
                                ) : (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'monospace' }}>
                                        {address.slice(0, 10)}...{address.slice(-8)}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: PQC */}
                            <div style={{
                                padding: '1.25rem',
                                background: pqcSecured ? 'rgba(189, 0, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                                borderRadius: '18px',
                                border: `1px solid ${pqcSecured ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.3s',
                                opacity: address ? 1 : 0.5,
                                pointerEvents: address ? 'all' : 'none'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Fingerprint size={20} style={{ color: pqcSecured ? 'var(--accent)' : 'var(--text-secondary)' }} />
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>PQC Biometric Auth</span>
                                    </div>
                                    {pqcSecured && <ShieldCheck size={18} className="text-accent" />}
                                </div>
                                {!pqcSecured ? (
                                    <div style={{ height: '52px' }}>
                                        <QidSignInButton
                                            sdk={qid}
                                            onSuccess={onPqcSuccess}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>
                                        Verified via ML-DSA Enclave
                                    </div>
                                )}
                            </div>

                            <AnimatePresence>
                                {(address && pqcSecured) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <Button
                                            grow
                                            variant="accent"
                                            onClick={finalizeLogin}
                                            style={{
                                                height: '64px',
                                                fontSize: '1.2rem',
                                                boxShadow: '0 0 40px rgba(189, 0, 255, 0.3)'
                                            }}
                                        >
                                            Enter Enclave <ChevronRight size={24} />
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Card>
                </div>
            </motion.div>

            {/* Footer */}
            <div style={{
                position: 'absolute',
                bottom: '2rem',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.75rem',
                textAlign: 'center',
                width: '100%'
            }}>
                Post-Quantum Cryptography Standard (FIPS 203) compliant. Built for the BNB Chain.
            </div>
        </div>
    );
};

