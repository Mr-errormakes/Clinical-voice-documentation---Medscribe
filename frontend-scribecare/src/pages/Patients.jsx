import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PatientDetailModal from '../components/PatientDetailModal';
import { Search, Plus, Users, ChevronRight, Phone, X } from 'lucide-react';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const data = await api.getPatients(q);
      setPatients(Array.isArray(data) ? data : []);
    } catch { setPatients([]); } finally { setLoading(false); }
  };

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(s)
      || (p.mrn || '').toLowerCase().includes(s)
      || (p.phone || '').includes(s);
  });

  const age = (dob) => {
    if (!dob) return '—';
    return Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000));
  };

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">Patients</div>
          <div className="page-head-sub">{patients.length} registered patients</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={17} /> Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="search-wrap mb-20" style={{ maxWidth: 460 }}>
        <Search size={16} className="search-icon" />
        <input
          className="input"
          placeholder="Search by name, MRN, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>MRN</th>
                <th>Age / Gender</th>
                <th>Phone</th>
                <th>Visits</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                  <td>
                    <div className="flex items-center gap-12">
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: p.gender === 'F' ? '#FDF2F8' : '#EFF6FF',
                        color: p.gender === 'F' ? '#BE185D' : 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.9rem',
                      }}>
                        {p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-600">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-sky">{p.mrn}</span></td>
                  <td>{age(p.dob)} yrs · {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '—'}</td>
                  <td>
                    {p.phone
                      ? <span className="flex items-center gap-4 text-sm"><Phone size={12} className="text-muted" />{p.phone}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td><span className="font-600">{p.total_visits}</span></td>
                  <td><ChevronRight size={16} className="text-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty card">
          <Users size={40} />
          <h3>No patients found</h3>
          <p>{search ? 'Try a different search term' : 'Add your first patient to get started'}</p>
          <button className="btn btn-primary btn-sm mt-8" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Add Patient
          </button>
        </div>
      )}

      {showCreate && (
        <CreatePatientModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setPatients((prev) => [p, ...prev]); setShowCreate(false); }}
        />
      )}

      {selected && (
        <PatientDetailModal patient={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function CreatePatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', dob: '', gender: '', phone: '', aadhaar_last4: '',
    blood_group: '', total_visits: 0, active_medications: '',
    discontinued_medications: '', consulting_doctor: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const mrn = `SCB-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
      const payload = {
        ...form, mrn,
        total_visits: parseInt(form.total_visits) || 0,
        active_medications: form.active_medications.split(',').map((m) => m.trim()).filter(Boolean),
        discontinued_medications: form.discontinued_medications.split(',').map((m) => m.trim()).filter(Boolean),
      };
      const patient = await api.createPatient(payload);
      onCreated(patient);
    } catch (err) {
      setError(err.message || 'Failed to create patient');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add New Patient</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-red">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Full Name *</label>
            <input className="input" placeholder="Patient full name" required value={form.name} onChange={set('name')} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Date of Birth</label>
              <input className="input" type="date" value={form.dob} onChange={set('dob')} />
            </div>
            <div className="field">
              <label>Gender</label>
              <select className="input" value={form.gender} onChange={set('gender')}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input className="input" placeholder="10-digit phone" value={form.phone} onChange={set('phone')} />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Blood Group</label>
              <select className="input" value={form.blood_group} onChange={set('blood_group')}>
                <option value="">Select</option>
                {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Consulting Doctor</label>
              <input className="input" placeholder="Doctor name" value={form.consulting_doctor} onChange={set('consulting_doctor')} />
            </div>
          </div>

          <div className="field">
            <label>Active Medications (comma separated)</label>
            <input className="input" placeholder="Metformin, Lisinopril" value={form.active_medications} onChange={set('active_medications')} />
          </div>

          <div className="flex gap-10 mt-8">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
