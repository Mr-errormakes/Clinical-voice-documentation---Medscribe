import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FileText, Users, Activity, Clock, Plus, ChevronRight,
  CheckCircle2, Stethoscope, Building2, UserCircle, Brain,
  Mic, Shield, TrendingUp, ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch { setStats({}); } finally { setLoading(false); }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page fade-in">

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="hero-banner" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '32px 40px 0' }}>
        {/* Top row: identity + action */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="hero-content">
            {/* Org + doctor pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {user?.org_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px' }}>
                  <Building2 size={12} color="rgba(255,255,255,0.7)" />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{user.org_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px' }}>
                <UserCircle size={12} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Dr. {user?.name}</span>
              </div>
            </div>
            <div className="hero-greeting">{greeting()}, Dr. {user?.name?.split(' ')[0] || 'Doctor'}</div>
            <div className="hero-date">{todayStr}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <button className="hero-btn" onClick={() => navigate('/consultation/new')}>
              <Plus size={16}  color="rgb(236, 243, 234)"/> New Consultation
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Stethoscope size={12} color="rgba(31, 61, 22, 0.4)" />
            </div>
          </div>
        </div>

        {/* Stats row — embedded into the banner bottom */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {[
            { label: 'Clinical Notes',    value: stats?.total_notes_generated ?? 0, icon: <FileText size={15} />,  path: '/notes',    caption: 'AI generated' },
            { label: 'Patients',          value: stats?.total_patients ?? 0,         icon: <Users size={15} />,     path: '/patients', caption: 'Registered' },
            { label: 'Consultations',     value: stats?.total_consultations ?? 0,    icon: <Activity size={15} />,  path: '/notes',    caption: 'Total sessions' },
            { label: 'Pending Review',    value: stats?.pending_reviews ?? 0,        icon: <Clock size={15} />,     path: '/notes',    caption: 'Needs approval', warn: true },
          ].map(({ label, value, icon, path, caption, warn }, i, arr) => (
            <div
              key={label}
              onClick={() => navigate(path)}
              style={{
                padding: '18px 24px 22px',
                cursor: 'pointer',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                transition: 'background 0.15s',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ color: warn && value > 0 ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>{icon}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: warn && value > 0 ? '#fbbf24' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: warn && value > 0 ? '#fbbf24' : '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{caption}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Notes ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border)', background: '#f9fafb' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={16} color="var(--primary)" />
            Recent AI-Clinical Notes
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notes')}>
            View all <ChevronRight size={14} />
          </button>
        </div>

        {stats?.recent_notes?.length ? (
          <div>
            {stats.recent_notes.map((note, i) => (
              <div
                key={note.id}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 22px', borderBottom: i < stats.recent_notes.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => navigate('/notes')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                  <FileText size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{note.patient_name || 'Unknown Patient'}</span>
                    {note.mrn && <span className="badge badge-sky">{note.mrn}</span>}
                    <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{note.template || 'SOAP'}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.preview || 'No preview available'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`badge ${note.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                    {note.status === 'approved'
                      ? <><CheckCircle2 size={10} /> Approved</>
                      : <><Clock size={10} /> Draft</>}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>{fmtDate(note.date)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 24px', gap: 12, textAlign: 'center' }}>
            <Stethoscope size={44} style={{ color: '#d1fae5' }} />
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#374151' }}>No notes yet</div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', maxWidth: 300 }}>
              Start a consultation to generate your first AI-powered clinical note
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/consultation/new')}>
              <Plus size={15} /> Start New Consultation
            </button>
          </div>
        )}
      </div>

      {/* ── Features info strip ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
        {[
          { icon: <Mic size={16} />,       title: 'Dual STT',         desc: 'Sarvam AI for Indian languages, Groq Whisper for English',  color: '#16a34a' },
          { icon: <Brain size={16} />,      title: 'AI Notes',         desc: 'Llama 3.3 70B structures SOAP, OPD & ABDM notes',           color: '#7c3aed' },
          { icon: <TrendingUp size={16} />, title: 'EMR Tracking',     desc: 'Vitals auto-extracted and tracked across consultations',    color: '#0284c7' },
          { icon: <Shield size={16} />,     title: 'Medication Mgmt',  desc: 'Full medication history with review reminders',             color: '#d97706' },
        ].map((f) => (
          <div key={f.title} style={{ background: '#c7fac7d8', borderRadius: 12, border: '2px solid var(--border)', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: f.color + '18', color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {f.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1f2937' }}>{f.title}</div>
              <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: 2, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
