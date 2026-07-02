import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Users, FileText, User, LogOut, Menu, X, BarChart } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
          background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Activity size={20} color="#0B0F19" />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Scribe<span style={{ color: 'var(--accent)' }}>Care</span>
        </span>
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <BarChart size={18} /> Dashboard
        </Link>
        <Link to="/patients" className={`nav-link ${location.pathname.startsWith('/patients') ? 'active' : ''}`}>
          <Users size={18} /> Patients
        </Link>
        {user?.role !== 'admin' && (
          <>
            <Link to="/consultation/new" className={`nav-link ${location.pathname === '/consultation/new' ? 'active' : ''}`}>
              <Activity size={18} /> New Consultation
            </Link>
            <Link to="/notes" className={`nav-link ${location.pathname.startsWith('/notes') ? 'active' : ''}`}>
              <FileText size={18} /> My Notes
            </Link>
          </>
        )}

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-icon" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-btn" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'none' }}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={{
          position: 'absolute', top: 'var(--header-height)', left: 0, right: 0,
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <Link to="/" onClick={closeMenu} className="nav-link">Dashboard</Link>
          <Link to="/patients" onClick={closeMenu} className="nav-link">Patients</Link>
          {user?.role !== 'admin' && (
            <>
              <Link to="/consultation/new" onClick={closeMenu} className="nav-link">New Consultation</Link>
              <Link to="/notes" onClick={closeMenu} className="nav-link">My Notes</Link>
            </>
          )}
          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
          <button onClick={handleLogout} className="btn btn-secondary w-full">Logout</button>
        </div>
      )}

      <style>{`
        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .nav-link:hover {
          color: var(--text-primary);
        }
        .nav-link.active {
          color: var(--accent);
        }
        @media (max-width: 500px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}
