import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Stethoscope, LogIn, UserPlus, Mic, FileText,
  Brain, Shield, Activity, CheckCircle2
} from 'lucide-react';

const FEATURES = [
  { icon: <Mic size={15} />,       text: 'AI Speech-to-Text in Indian languages via Sarvam AI' },
  { icon: <Brain size={15} />,      text: 'SOAP · Hospital OPD · ABDM structured note generation' },
  { icon: <Activity size={15} />,   text: 'Auto-extracted vitals from reports — no manual entry' },
  { icon: <FileText size={15} />,   text: 'Professional clinical PDF reports with patient EMR data' },
  { icon: <Shield size={15} />,     text: 'Secure patient records with medication history & trends' },
];

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', org_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await signup({ email: form.email, password: form.password, name: form.name, org_name: form.org_name, role: 'clinician' });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#fff' }}>

      {/* ── Left — Branding panel ── */}
      <div style={{
        background: 'linear-gradient(160deg, #052e16 0%, #14532d 55%, #16a34a 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '48px 52px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background circle decoration */}
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -40, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Logo + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Stethoscope size={28} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Namma ScribeCare
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>
              AI Clinical Documentation
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ flex: 1 }}>
          <h2 style={{
            color: '#fff', fontSize: '1.6rem', fontWeight: 700,
            lineHeight: 1.35, letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Your AI-powered<br />medical scribe
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.65)', fontSize: '0.92rem',
            lineHeight: 1.75, marginBottom: 32,
          }}>
            Record consultations, auto-generate structured clinical notes,
            and maintain complete patient EMR records — all in minutes, not hours.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#86efac',
                }}>
                  {f.icon}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', lineHeight: 1.55 }}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div style={{ marginTop: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 99, padding: '6px 14px',
          }}>
            <CheckCircle2 size={13} color="#86efac" />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              ABDM · SOAP · Hospital OPD · EMR Integration
            </span>
          </div>
        </div>
      </div>

      {/* ── Right — Form panel ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', background: '#f9fafb',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Form header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
              {mode === 'login'
                ? 'Welcome back to Namma ScribeCare'
                : 'Start documenting smarter today'}
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: '#991b1b', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <>
                <div className="field">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Full Name</label>
                  <input className="input" placeholder="Dr. Priya Sharma" required value={form.name} onChange={set('name')} style={{ background: '#fff' }} />
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Hospital / Clinic</label>
                  <input className="input" placeholder="Apollo Hospitals, Chennai" value={form.org_name} onChange={set('org_name')} style={{ background: '#fff' }} />
                </div>
              </>
            )}

            <div className="field">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email Address</label>
              <input className="input" type="email" placeholder="doctor@hospital.com" required value={form.email} onChange={set('email')} style={{ background: '#fff' }} />
            </div>

            <div className="field">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" required value={form.password} onChange={set('password')} style={{ background: '#fff' }} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '13px',
                background: loading ? '#86efac' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s, box-shadow 0.15s',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.background = '#15803d'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.background = '#16a34a'; }}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? <><LogIn size={17} /> Sign In</>
                  : <><UserPlus size={17} /> Create Account</>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.84rem', color: '#6b7280' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem', fontFamily: 'inherit' }}
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Mobile fallback */}
      <style>{`
        @media (max-width: 700px) {
          div[style*="gridTemplateColumns: '1fr 1fr'"] { grid-template-columns: 1fr !important; }
          div[style*="background: linear-gradient(160deg"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
