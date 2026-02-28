import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { MarketplacePage } from './features/marketplace/MarketplacePage';
import { SecurityPage } from './features/security/SecurityPage';
import { AuditLogPage } from './features/security/AuditLogPage';
import { LiquidationPage } from './features/liquidation/LiquidationPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Navbar />

      <main className="container">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <PageWrapper key="dashboard">
                <DashboardPage />
              </PageWrapper>
            } />
            <Route path="/marketplace" element={
              <PageWrapper key="marketplace">
                <MarketplacePage />
              </PageWrapper>
            } />
            <Route path="/security" element={
              <PageWrapper key="security">
                <SecurityPage />
              </PageWrapper>
            } />
            <Route path="/security/history" element={
              <PageWrapper key="audit-log">
                <AuditLogPage />
              </PageWrapper>
            } />
            <Route path="/guardian" element={
              <PageWrapper key="guardian">
                <LiquidationPage />
              </PageWrapper>
            } />
            <Route path="/profile" element={
              <PageWrapper key="profile">
                <ProfilePage />
              </PageWrapper>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <footer className="container" style={{ marginTop: '5rem', paddingBottom: '3rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>
          &copy; 2026 BNB Vault PQC. Built for the BNB Chain Hackathon.
          Powered by <span style={{ color: 'var(--primary)' }}>opBNB</span>, <span style={{ color: 'var(--primary)' }}>BNB Greenfield</span>, and <span style={{ color: 'var(--accent)' }}>QidCloud</span>.
        </p>
      </footer>
    </div>
  );
}

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export default App;
