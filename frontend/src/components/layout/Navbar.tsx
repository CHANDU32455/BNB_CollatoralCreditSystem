import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Wallet, Lock, LayoutDashboard, ShoppingCart, ShieldAlert, Zap, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export const Navbar: React.FC = () => {
    const { address, isLoggedIn, logout } = useAuth();

    return (
        <nav className="nav-bar container">
            <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
                <Lock size={28} style={{ color: 'var(--primary)' }} />
                BNB<span style={{ color: 'var(--primary)' }}>Vault.PQC</span>
            </Link>

            {isLoggedIn && (
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} /> Dashboard
                    </NavLink>
                    <NavLink to="/marketplace" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <ShoppingCart size={18} /> Marketplace
                    </NavLink>
                    <NavLink to="/security" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <ShieldAlert size={18} /> Security
                    </NavLink>
                    <NavLink to="/guardian" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Zap size={18} /> Guardian
                    </NavLink>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {address ? (
                    <div className="status-badge status-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={14} /> {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                ) : (
                    <span className="text-muted">Not Connected</span>
                )}

                {isLoggedIn && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={logout}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                    </motion.button>
                )}
            </div>
        </nav>
    );
};
