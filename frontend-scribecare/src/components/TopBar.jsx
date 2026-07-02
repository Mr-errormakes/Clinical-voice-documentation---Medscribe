import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, Stethoscope, Plus, ChevronRight } from 'lucide-react';

const PAGE_TITLES = {
  '/':                 { title: 'Dashboard',        sub: 'Clinical overview' },
  '/patients':         { title: 'Patients',          sub: 'EMR records' },
  '/consultation/new': { title: 'New Consultation',  sub: 'Record & generate note' },
  '/notes':            { title: 'My Notes',          sub: 'Review & approve' },
  '/settings':         { title: 'Settings',          sub: 'Account & preferences' },
};

export default function TopBar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const page    = PAGE_TITLES[location.pathname] || { title: 'Namma ScribeCare', sub: '' };
  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'DR';

  return (
    <header className="topbar">
      {/* ── Left: hamburger + breadcrumb ── */}
      <div className="topbar-left">
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>

        <div className="topbar-brand" onClick={() => navigate('/')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate('/')}>
          <div className="topbar-brand-icon">
            <Stethoscope size={15} />
          </div>
          <span className="topbar-brand-name">Namma ScribeCare</span>
        </div>

        {location.pathname !== '/' && (
          <>
            <ChevronRight size={14} className="topbar-sep" />
            <span className="topbar-page-title">{page.title}</span>
          </>
        )}
      </div>

      {/* ── Right: action + user ── */}
      <div className="topbar-right">
        {location.pathname !== '/consultation/new' && (
          <button className="topbar-new-btn" onClick={() => navigate('/consultation/new')}>
            <Plus size={15} />
            <span>New Consultation</span>
          </button>
        )}

        <div className="topbar-user-chip">
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-user-text">
            <span className="topbar-user-name">Dr. {user?.name?.split(' ')[0]}</span>
            {user?.org_name && <span className="topbar-user-org">{user.org_name}</span>}
          </div>
        </div>
      </div>
    </header>
  );
}
