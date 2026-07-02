import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope, LayoutDashboard, Users, FileText,
  LogOut, Plus, Settings, Activity, X
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Clinical',
    items: [
      { path: '/consultation/new', icon: Plus,            label: 'New Consultation', highlight: true },
      { path: '/',                  icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Records',
    items: [
      { path: '/patients', icon: Users,    label: 'Patients' },
      { path: '/notes',    icon: FileText, label: 'My Notes' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close on route change
  useEffect(() => { onClose(); }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const initials = user?.name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'DR';

  return (
    <>
      {/* ── Backdrop overlay ── */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer ── */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} aria-label="Navigation">

        {/* Header row */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Stethoscope size={17} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="sidebar-logo-text">Namma ScribeCare</div>
            <div className="sidebar-logo-sub">AI Clinical Scribe</div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="sidebar-nav-section">{section.label}</div>
              {section.items.map(({ path, icon: Icon, label, highlight }) => (
                <Link
                  key={path}
                  to={path}
                  className={[
                    'sidebar-link',
                    isActive(path) ? 'active' : '',
                    highlight ? 'highlight-link' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* AI status badge */}
        <div className="sidebar-ai-badge">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Activity size={11} color="#86efac" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              AI Services Online
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
            Sarvam AI · Groq Whisper<br />Llama 3.3 70B · Tesseract OCR
          </div>
        </div>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Dr. {user?.name || 'Doctor'}</div>
            <div className="sidebar-user-role">{user?.org_name || user?.role || 'Clinician'}</div>
          </div>
          <button
            className="sidebar-logout"
            title="Sign out"
            onClick={() => { logout(); navigate('/login'); }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
