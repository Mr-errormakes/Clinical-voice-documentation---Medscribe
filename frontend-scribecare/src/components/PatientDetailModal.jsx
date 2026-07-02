import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  X, User, Phone, Hash, FileText, Activity, Pill, Plus,
  CheckCircle2, Download, ChevronDown, ChevronUp,
  Trash2, RefreshCw, Edit3, AlertTriangle, Heart, Thermometer,
  Weight, Droplets, Wind, Calendar, Clock
} from 'lucide-react';

/* ── Colour helpers ─────────────────────────────────────────── */
const vitalStatus = (field, val) => {
  if (val == null) return 'normal';
  if (field === 'bp_systolic')   return val > 140 ? 'high' : val < 90  ? 'low' : 'normal';
  if (field === 'bp_diastolic')  return val > 90  ? 'high' : val < 60  ? 'low' : 'normal';
  if (field === 'temperature')   return val > 100.4 ? 'high' : val < 96 ? 'low' : 'normal';
  if (field === 'blood_glucose') return val > 125  ? 'high' : val < 70  ? 'low' : 'normal';
  if (field === 'spo2')          return val < 95   ? 'low'  : 'normal';
  if (field === 'pulse_rate')    return val > 100  ? 'high' : val < 60  ? 'low' : 'normal';
  return 'normal';
};

const statusColor = { normal: 'var(--success)', high: 'var(--danger)', low: '#F59E0B' };

function VBadge({ field, val, unit }) {
  if (val == null) return <span className="text-muted">—</span>;
  const s = vitalStatus(field, val);
  return (
    <span style={{ fontWeight: 600, color: statusColor[s] }}>
      {val} <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit}</span>
    </span>
  );
}

const today = () => new Date().toISOString().split('T')[0];

/* ════════════════════════════════════════════════════════════ */
export default function PatientDetailModal({ patient, onClose }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [details, setDetails]       = useState(null);
  const [vitals, setVitals]         = useState([]);
  const [meds, setMeds]             = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { load(); }, [patient.id]);

  const load = async () => {
    setLoading(true);
    try {
      const [det, vit, med] = await Promise.all([
        api.getPatientDetails(patient.id),
        api.getVitals(patient.id),
        api.getMedications(patient.id),
      ]);
      setDetails(det);
      setVitals(Array.isArray(vit) ? vit : []);
      setMeds(Array.isArray(med) ? med : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const age = (dob) => {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000));
  };

  const TABS = [
    { key: 'overview',    label: 'Overview',    icon: <User size={15} /> },
    { key: 'vitals',      label: 'Vitals',      icon: <Activity size={15} /> },
    { key: 'medications', label: 'Medications', icon: <Pill size={15} /> },
    { key: 'history',     label: 'History',     icon: <FileText size={15} /> },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff11',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.78)',
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-14">
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: patient.gender === 'F' ? '#FDF2F8' : '#EFF6FF',
                color: patient.gender === 'F' ? '#BE185D' : 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1.2rem',
              }}>
                {patient.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{patient.name}</div>
                <div className="flex items-center gap-8 mt-4" style={{ flexWrap: 'wrap' }}>
                  <span className="badge badge-sky"><Hash size={10} />{patient.mrn}</span>
                  <span className="text-sm text-muted">
                    {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : '—'} · {age(patient.dob)} yrs
                  </span>
                  {patient.phone && <span className="text-sm text-muted flex items-center gap-4"><Phone size={12} />{patient.phone}</span>}
                  {patient.blood_group && <span className="badge badge-red">🩸 {patient.blood_group}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-8">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { onClose(); navigate('/consultation/new'); }}
              >
                <Plus size={14} /> New Visit
              </button>
              <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  border: 'none', background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.84rem', fontWeight: tab === t.key ? 600 : 400,
                  color: tab === t.key ? 'var(--primary)' : 'var(--bg-input)',
                  borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <>
              {tab === 'overview'    && <OverviewTab patient={patient} details={details} age={age} />}
              {tab === 'vitals'      && <VitalsTab patientId={patient.id} vitals={vitals} onRefresh={load} />}
              {tab === 'medications' && <MedicationsTab patientId={patient.id} meds={meds} onRefresh={load} />}
              {tab === 'history'     && <HistoryTab details={details} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Overview
════════════════════════════════════════════════════════════ */
function OverviewTab({ patient, details, age }) {
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          ['Date of Birth', patient.dob ? new Date(patient.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
          ['Age',           `${age(patient.dob)} years`],
          ['Blood Group',   patient.blood_group || '—'],
          ['Total Visits',  patient.total_visits ?? 0],
          ['Consulting Doctor', patient.consulting_doctor || '—'],
          ['Aadhaar (last 4)',  patient.aadhaar_last4 ? `••••${patient.aadhaar_last4}` : '—'],
        ].map(([label, val]) => (
          <div key={label} style={{ background: '#f8fafcec', borderRadius: 10, padding: '14px 16px' }}>
            <div className="text-xs text-muted mb-4" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Notes count */}
      {details && (
        <div style={{ background: 'var(--primary-soft)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--primary-border)' }}>
          <div className="text-xs text-muted mb-4" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary)' }}>Clinical Activity</div>
          <div className="flex gap-24">
            <div><span style={{ fontWeight: 700, fontSize: '1.4rem' }}>{details.consultations?.length ?? 0}</span><div className="text-xs text-muted">Consultations</div></div>
            <div><span style={{ fontWeight: 700, fontSize: '1.4rem' }}>{details.notes?.length ?? 0}</span><div className="text-xs text-muted">Notes</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Vitals
════════════════════════════════════════════════════════════ */
function VitalsTab({ patientId, vitals, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bp_systolic: '', bp_diastolic: '', temperature: '', weight: '', height: '',
    blood_glucose: '', spo2: '', pulse_rate: '', respiratory_rate: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '') payload[k] = k === 'notes' ? v : Number(v);
      });
      await api.addVital(patientId, payload);
      setShowForm(false);
      setForm({ bp_systolic: '', bp_diastolic: '', temperature: '', weight: '', height: '', blood_glucose: '', spo2: '', pulse_rate: '', respiratory_rate: '', notes: '' });
      onRefresh();
    } catch (e) { alert('Failed to save: ' + e.message); }
    setSaving(false);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-20">
        <div>
          <div style={{ fontWeight: 700 }}>Vital Signs History</div>
          <div className="text-xs text-muted mt-2">EMR secondary readings across all visits</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Reading</>}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="fade-in" style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>New Vital Reading</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { key: 'bp_systolic',      label: 'BP Systolic',      unit: 'mmHg', placeholder: '120' },
              { key: 'bp_diastolic',     label: 'BP Diastolic',     unit: 'mmHg', placeholder: '80' },
              { key: 'pulse_rate',       label: 'Pulse Rate',       unit: 'bpm',  placeholder: '72' },
              { key: 'temperature',      label: 'Temperature',      unit: '°F',   placeholder: '98.6' },
              { key: 'spo2',             label: 'SpO2',             unit: '%',    placeholder: '98' },
              { key: 'respiratory_rate', label: 'Resp. Rate',       unit: '/min', placeholder: '16' },
              { key: 'blood_glucose',    label: 'Blood Glucose',    unit: 'mg/dL',placeholder: '95' },
              { key: 'weight',           label: 'Weight',           unit: 'kg',   placeholder: '70' },
              { key: 'height',           label: 'Height',           unit: 'cm',   placeholder: '170' },
            ].map(({ key, label, unit, placeholder }) => (
              <div key={key} className="field">
                <label>{label} <span className="text-muted" style={{ fontSize: '0.72rem' }}>({unit})</span></label>
                <input className="input" type="number" placeholder={placeholder} value={form[key]} onChange={set(key)} />
              </div>
            ))}
          </div>
          <div className="field mt-12">
            <label>Notes</label>
            <input className="input" placeholder="Any remarks..." value={form.notes} onChange={set('notes')} />
          </div>
          <button className="btn btn-primary btn-sm mt-16" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><CheckCircle2 size={14} /> Save Reading</>}
          </button>
        </div>
      )}

      {/* Table */}
      {vitals.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Date', 'BP', 'Pulse', 'Temp', 'SpO2', 'Glucose', 'Weight', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vitals.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{fmtDate(v.recorded_at)}</div>
                    {v.notes && <div className="text-xs text-muted mt-2">{v.notes}</div>}
                  </td>
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                    {v.bp_systolic && v.bp_diastolic
                      ? <span style={{ fontWeight: 600, color: statusColor[vitalStatus('bp_systolic', v.bp_systolic)] }}>
                          {v.bp_systolic}/{v.bp_diastolic} <span className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 400 }}>mmHg</span>
                        </span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ padding: '12px' }}><VBadge field="pulse_rate" val={v.pulse_rate} unit="bpm" /></td>
                  <td style={{ padding: '12px' }}><VBadge field="temperature" val={v.temperature} unit="°F" /></td>
                  <td style={{ padding: '12px' }}><VBadge field="spo2" val={v.spo2} unit="%" /></td>
                  <td style={{ padding: '12px' }}><VBadge field="blood_glucose" val={v.blood_glucose} unit="mg/dL" /></td>
                  <td style={{ padding: '12px' }}>{v.weight ? `${v.weight} kg` : '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--danger)' }}
                      onClick={async () => { await api.deleteVital(v.patient_id, v.id); onRefresh(); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty" style={{ padding: '48px 0' }}>
          <Activity size={36} />
          <h3>No vitals recorded</h3>
          <p>Add the first vital reading to start tracking this patient's secondary readings</p>
        </div>
      )}

      {/* Reference legend */}
      <div className="flex gap-16 mt-16" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--success)' }}>● Normal</span>
        <span style={{ color: 'var(--danger)' }}>● High</span>
        <span style={{ color: '#F59E0B' }}>● Low</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: Medications
════════════════════════════════════════════════════════════ */
function MedicationsTab({ patientId, meds, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [discId, setDiscId] = useState(null);

  const active = meds.filter((m) => m.status === 'active');
  const discontinued = meds.filter((m) => m.status === 'discontinued');

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-20">
        <div>
          <div style={{ fontWeight: 700 }}>Medication Record</div>
          <div className="text-xs text-muted mt-2">{active.length} active · {discontinued.length} discontinued</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Medication</>}
        </button>
      </div>

      {showAdd && <AddMedForm patientId={patientId} onSaved={() => { setShowAdd(false); onRefresh(); }} />}

      {/* Active */}
      <div style={{ marginBottom: 28 }}>
        <div className="flex items-center gap-8 mb-12">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Active Medications</span>
          <span className="badge badge-green">{active.length}</span>
        </div>

        {active.length === 0
          ? <p className="text-sm text-muted" style={{ padding: '12px 0' }}>No active medications</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.map((m) => (
                <MedCard
                  key={m.id}
                  med={m}
                  patientId={patientId}
                  onRefresh={onRefresh}
                  editing={editId === m.id}
                  onEdit={() => setEditId(editId === m.id ? null : m.id)}
                  discontinuing={discId === m.id}
                  onDisc={() => setDiscId(discId === m.id ? null : m.id)}
                />
              ))}
            </div>}
      </div>

      {/* Discontinued */}
      {discontinued.length > 0 && (
        <div>
          <div className="flex items-center gap-8 mb-12">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Discontinued</span>
            <span className="badge badge-gray">{discontinued.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {discontinued.map((m) => (
              <DiscCard key={m.id} med={m} patientId={patientId} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {meds.length === 0 && !showAdd && (
        <div className="empty" style={{ padding: '48px 0' }}>
          <Pill size={36} />
          <h3>No medications recorded</h3>
          <p>Add medications to track this patient's prescription history</p>
        </div>
      )}
    </div>
  );
}

function AddMedForm({ patientId, onSaved }) {
  const [form, setForm] = useState({ name: '', dosage: '', frequency: '', route: 'Oral', started_on: today(), review_after: '', prescribed_by: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Medication name is required'); return; }
    setSaving(true);
    try {
      await api.addMedication(patientId, form);
      onSaved();
    } catch (e) { alert('Failed: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="fade-in" style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #BBF7D0' }}>
      <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 14 }}>Add New Medication</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field" style={{ gridColumn: '1/-1' }}>
          <label>Medication Name *</label>
          <input className="input" placeholder="e.g. Metformin" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label>Dosage</label>
          <input className="input" placeholder="500 mg" value={form.dosage} onChange={set('dosage')} />
        </div>
        <div className="field">
          <label>Frequency</label>
          <select className="input" value={form.frequency} onChange={set('frequency')}>
            <option value="">Select</option>
            {['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Once daily at night', 'SOS / As needed', 'Once weekly', 'Once monthly'].map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Route</label>
          <select className="input" value={form.route} onChange={set('route')}>
            {['Oral', 'Topical', 'Injection', 'Inhaler', 'Sublingual', 'IV'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Review After</label>
          <select className="input" value={form.review_after} onChange={set('review_after')}>
            <option value="">Select</option>
            {['2 weeks', '1 month', '3 months', '6 months', '1 year', 'Ongoing'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Started On</label>
          <input className="input" type="date" value={form.started_on} onChange={set('started_on')} />
        </div>
        <div className="field">
          <label>Prescribed By</label>
          <input className="input" placeholder="Dr. Name" value={form.prescribed_by} onChange={set('prescribed_by')} />
        </div>
        <div className="field" style={{ gridColumn: '1/-1' }}>
          <label>Notes</label>
          <input className="input" placeholder="Instructions, special notes..." value={form.notes} onChange={set('notes')} />
        </div>
      </div>
      <button className="btn btn-primary btn-sm mt-14" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : <><CheckCircle2 size={14} /> Add Medication</>}
      </button>
    </div>
  );
}

function MedCard({ med, patientId, onRefresh, editing, onEdit, discontinuing, onDisc }) {
  const [editForm, setEditForm] = useState({ dosage: med.dosage || '', frequency: med.frequency || '', route: med.route || 'Oral', review_after: med.review_after || '', notes: med.notes || '' });
  const [discForm, setDiscForm] = useState({ stopped_on: today(), stop_reason: '' });
  const [saving, setSaving] = useState(false);

  const reviewDue = () => {
    if (!med.started_on || !med.review_after) return null;
    const months = { '2 weeks': 0.5, '1 month': 1, '3 months': 3, '6 months': 6, '1 year': 12 };
    const m = months[med.review_after];
    if (!m) return null;
    const due = new Date(med.started_on);
    due.setMonth(due.getMonth() + m);
    return due < new Date() ? 'overdue' : due < new Date(Date.now() + 14 * 86400000) ? 'soon' : null;
  };

  const review = reviewDue();

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Pill size={16} color="var(--success)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{med.name}</div>
              <div className="text-xs text-muted mt-2 flex items-center gap-8">
                {med.dosage && <span>{med.dosage}</span>}
                {med.frequency && <><span>·</span><span>{med.frequency}</span></>}
                {med.route && <><span>·</span><span>{med.route}</span></>}
              </div>
              {med.review_after && (
                <div className="flex items-center gap-6 mt-4">
                  <Clock size={11} className="text-muted" />
                  <span className="text-xs text-muted">Review: {med.review_after}</span>
                  {review === 'overdue' && <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>Overdue</span>}
                  {review === 'soon'    && <span className="badge badge-yellow" style={{ fontSize: '0.68rem' }}>Due soon</span>}
                </div>
              )}
              {med.started_on && <div className="text-xs text-muted mt-2">Started: {med.started_on}</div>}
            </div>
          </div>
          <div className="flex gap-6">
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={onEdit} title="Edit">
              <Edit3 size={13} />
            </button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: '#D97706' }} onClick={onDisc} title="Discontinue">
              <AlertTriangle size={13} />
            </button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--danger)' }}
              onClick={async () => { if (window.confirm('Delete this medication?')) { await api.deleteMedication(patientId, med.id); onRefresh(); } }}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="fade-in" style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', background: '#FAFAFA' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 14 }}>
            {[
              { k: 'dosage', label: 'Dosage', ph: '500 mg' },
              { k: 'notes',  label: 'Notes',  ph: 'Instructions' },
            ].map(({ k, label, ph }) => (
              <div key={k} className="field">
                <label>{label}</label>
                <input className="input" placeholder={ph} value={editForm[k]} onChange={(e) => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="field">
              <label>Frequency</label>
              <select className="input" value={editForm.frequency} onChange={(e) => setEditForm(f => ({ ...f, frequency: e.target.value }))}>
                <option value="">Select</option>
                {['Once daily', 'Twice daily', 'Three times daily', 'Once daily at night', 'SOS / As needed', 'Once weekly'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Review After</label>
              <select className="input" value={editForm.review_after} onChange={(e) => setEditForm(f => ({ ...f, review_after: e.target.value }))}>
                <option value="">Select</option>
                {['2 weeks', '1 month', '3 months', '6 months', '1 year', 'Ongoing'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-sm mt-10" disabled={saving} onClick={async () => {
            setSaving(true);
            try { await api.updateMedication(patientId, med.id, editForm); onEdit(); onRefresh(); } catch (e) { alert(e.message); }
            setSaving(false);
          }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Discontinue panel */}
      {discontinuing && (
        <div className="fade-in" style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', background: '#FFFBEB' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 14 }}>
            <div className="field">
              <label>Stopped On</label>
              <input className="input" type="date" value={discForm.stopped_on} onChange={(e) => setDiscForm(f => ({ ...f, stopped_on: e.target.value }))} />
            </div>
            <div className="field">
              <label>Reason</label>
              <input className="input" placeholder="Side effects, goal achieved..." value={discForm.stop_reason} onChange={(e) => setDiscForm(f => ({ ...f, stop_reason: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-sm mt-10" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }} disabled={saving} onClick={async () => {
            setSaving(true);
            try { await api.discontinueMedication(patientId, med.id, discForm); onDisc(); onRefresh(); } catch (e) { alert(e.message); }
            setSaving(false);
          }}>
            {saving ? 'Updating...' : <><AlertTriangle size={13} /> Discontinue</>}
          </button>
        </div>
      )}
    </div>
  );
}

function DiscCard({ med, patientId, onRefresh }) {
  return (
    <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid var(--border)', opacity: 0.8 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Pill size={15} color="var(--text-muted)" />
          <div>
            <span style={{ fontWeight: 600, textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{med.name}</span>
            {med.dosage && <span className="text-xs text-muted"> · {med.dosage}</span>}
            {med.stopped_on && <div className="text-xs text-muted mt-2">Stopped: {med.stopped_on} {med.stop_reason && `— ${med.stop_reason}`}</div>}
          </div>
        </div>
        <div className="flex gap-6">
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={async () => { await api.reactivateMedication(patientId, med.id); onRefresh(); }}>
            <RefreshCw size={12} /> Reactivate
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--danger)' }} onClick={async () => { if (window.confirm('Delete?')) { await api.deleteMedication(patientId, med.id); onRefresh(); } }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TAB: History (consultation timeline + reports)
════════════════════════════════════════════════════════════ */
function HistoryTab({ details }) {
  const [expanded, setExpanded] = useState(null);

  const notes = details?.notes?.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];
  const reports = details?.consultations?.flatMap(c => c.attachments || []).filter(a => a.type?.startsWith('report_')).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)) || [];

  return (
    <div className="fade-in">
      {/* Notes timeline */}
      <div style={{ fontWeight: 700, marginBottom: 14 }}>Clinical Notes Timeline</div>

      {notes.length === 0 ? (
        <div className="empty" style={{ padding: '32px 0' }}>
          <FileText size={32} />
          <p>No consultation notes yet</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border)' }} />

          {notes.map((note, i) => {
            const isOpen = expanded === note.id;
            const assessment = note.note_content?.assessment || note.note_content?.diagnosis || note.note_content?.presentation || '—';
            const plan = note.note_content?.plan || note.note_content?.advice || note.note_content?.treatment_plan || '—';
            return (
              <div key={note.id} style={{ position: 'relative', marginBottom: 14 }}>
                {/* Dot */}
                <div style={{ position: 'absolute', left: -16, top: 14, width: 10, height: 10, borderRadius: '50%', background: note.status === 'approved' ? 'var(--success)' : 'var(--warning)', border: '2px solid #fff', boxShadow: '0 0 0 2px var(--border)' }} />
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : note.id)}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="flex items-center gap-8">
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>{note.template || 'soap'}</span>
                        <span className={`badge ${note.status === 'approved' ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.68rem' }}>{note.status}</span>
                      </div>
                      <div className="text-xs text-muted mt-4 truncate" style={{ maxWidth: 500 }}>{assessment}</div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  </div>
                  {isOpen && (
                    <div className="fade-in" style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                      {note.note_content && Object.entries(note.note_content).map(([k, v]) => (
                        <div key={k} style={{ marginTop: 10 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: 3 }}>{k.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{v || '—'}</div>
                        </div>
                      ))}
                      <button className="btn btn-secondary btn-sm mt-12" onClick={(e) => { e.stopPropagation(); window.open(api.exportNotePdf(note.id), '_blank'); }}>
                        <Download size={13} /> Export PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reports */}
      {reports.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Uploaded Reports</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reports.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--border)' }}>
                <FileText size={16} color="var(--primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.file_path.split(/[/\\]/).pop()}</div>
                  <div className="flex items-center gap-8 mt-2">
                    <span className="badge badge-sky" style={{ fontSize: '0.68rem' }}>{r.type === 'report_old' ? 'Previous' : 'Current'}</span>
                    <span className="text-xs text-muted">{new Date(r.uploaded_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <a href={`${api.baseUrl}/${r.file_path.replace(/\\/g, '/')}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <Download size={13} /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
