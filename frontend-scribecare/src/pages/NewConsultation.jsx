import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Mic, MicOff, Upload, FileText, ChevronRight, CheckCircle2,
  ArrowLeft, Trash2, Square, User, Search
} from 'lucide-react';

const STEPS = ['Patient', 'Audio', 'Reports', 'Template', 'Processing', 'Review'];

const TEMPLATES = [
  { value: 'soap',         label: 'SOAP Note',       desc: 'Subjective · Objective · Assessment · Plan' },
  { value: 'hospital_opd', label: 'Hospital OPD',    desc: 'Presentation · Vitals · Investigations · Treatment' },
  { value: 'abdm',         label: 'ABDM Compliant',  desc: 'Findings · Diagnosis · Medication · Advice' },
];

const PROCESS_STEPS = [
  'Transcribing audio with Groq Whisper',
  'Extracting text from reports (PDF / OCR)',
  'Auto-extracting vital signs with AI',
  'Comparing current vs previous records',
  'Generating structured clinical note',
];

export default function NewConsultation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Step 2
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  // Step 3
  const [oldReports, setOldReports] = useState([]);
  const [newReports, setNewReports] = useState([]);

  // Step 4
  const [template, setTemplate] = useState('soap');

  // Step 5-6
  const [procStep, setProcStep] = useState(0);
  const [result, setResult] = useState(null);
  const [editableNote, setEditableNote] = useState(null);
  const [consultationId, setConsultationId] = useState(null);

  /* ── Helpers ── */
  const handlePatientSearch = async (q) => {
    setPatientSearch(q);
    if (q.length < 1) { setPatients([]); return; }
    try {
      const data = await api.getPatients(q);
      setPatients(Array.isArray(data) ? data : []);
    } catch { setPatients([]); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setAudioFile(new File([blob], 'consultation-recording.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied. Please upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
  };

  const handleProcess = async () => {
    setStep(5);
    setProcStep(0);
    try {
      setProcStep(1);
      const c = await api.createConsultation({ patient_id: selectedPatient.id });
      setConsultationId(c.id);

      setProcStep(2);
      if (audioFile) await api.uploadAudio(c.id, audioFile);
      if (oldReports.length > 0) await api.uploadReports(c.id, oldReports, 'old');
      if (newReports.length > 0) await api.uploadReports(c.id, newReports, 'new');

      setProcStep(3);
      const res = await api.processConsultation(c.id, template);

      setProcStep(4);
      const noteData = await api.getNote(res.note_id);

      setResult({ transcript: noteData.transcript, note: noteData.note_content, note_id: noteData.id });
      setEditableNote(noteData.note_content);
      setStep(6);
    } catch (err) {
      alert('Processing failed: ' + err.message);
      setStep(4);
    }
  };

  const handleApprove = async () => {
    try {
      await api.updateNote(result.note_id, editableNote);
      await api.approveNote(result.note_id);
      navigate('/notes');
    } catch (err) {
      alert('Failed to approve: ' + err.message);
    }
  };

  /* ── Step indicator ── */
  const StepBar = () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 32 }}>
      {STEPS.slice(0, 4).map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
                background: done ? 'var(--success)' : active ? 'var(--primary)' : '#fff',
                color: done || active ? '#fff' : 'var(--text-muted)',
                border: done || active ? 'none' : '2px solid var(--border)',
                boxShadow: active ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                transition: 'all 0.25s',
              }}>
                {done ? <CheckCircle2 size={16} /> : n}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: active ? 600 : 400, color: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div style={{ height: 2, flex: 1, background: done ? 'var(--success)' : 'var(--border)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );

  /* ── Step 1: Patient ── */
  if (step === 1) return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">New Consultation</div>
          <div className="page-head-sub">Step 1 of 4 — Select patient</div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/')}><ArrowLeft size={16} /> Back</button>
      </div>
      <StepBar />

      <div className="card" style={{ maxWidth: 580 }}>
        <h3 className="mb-16">Search Patient</h3>
        <div className="search-wrap mb-16">
          <Search size={16} className="search-icon" />
          <input
            className="input"
            placeholder="Name, MRN, phone, or Aadhaar..."
            value={patientSearch}
            onChange={(e) => handlePatientSearch(e.target.value)}
            autoFocus
          />
        </div>

        {patients.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {patients.map((p) => (
              <div
                key={p.id}
                className="card card-hover card-sm"
                style={{ border: selectedPatient?.id === p.id ? '1.5px solid var(--primary)' : '1px solid var(--border)', background: selectedPatient?.id === p.id ? 'var(--primary-soft)' : '#fff' }}
                onClick={() => setSelectedPatient(p)}
              >
                <div className="flex items-center gap-12">
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>
                    {p.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-8">
                      <span className="font-600">{p.name}</span>
                      <span className="badge badge-sky">{p.mrn}</span>
                    </div>
                    <div className="text-sm text-muted mt-4">
                      {p.gender === 'M' ? 'Male' : 'Female'} · {p.total_visits} visits {p.phone && `· ${p.phone}`}
                    </div>
                  </div>
                  {selectedPatient?.id === p.id && <CheckCircle2 size={18} color="var(--primary)" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedPatient && (
          <div className="alert alert-green mt-16 flex items-center gap-8">
            <CheckCircle2 size={16} />
            <span>Selected: <strong>{selectedPatient.name}</strong> — {selectedPatient.mrn}</span>
          </div>
        )}

        <button className="btn btn-primary mt-20" disabled={!selectedPatient} onClick={() => setStep(2)}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  /* ── Step 2: Audio ── */
  if (step === 2) return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">New Consultation</div>
          <div className="page-head-sub">Step 2 of 4 — Record or upload consultation audio</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
      </div>
      <StepBar />

      <div className="card" style={{ maxWidth: 580 }}>
        <div className="flex items-center gap-10 mb-20" style={{ padding: '10px 14px', background: 'var(--primary-soft)', borderRadius: 8, border: '1px solid var(--primary-border)' }}>
          <User size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 500 }}>
            Patient: <strong>{selectedPatient?.name}</strong> ({selectedPatient?.mrn})
          </span>
        </div>

        <div className="grid-2 mb-20">
          {/* Record */}
          <div>
            <p className="text-xs text-muted mb-8" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Record live</p>
            <div className="upload-zone" style={{ minHeight: 160 }}>
              {isRecording ? (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MicOff size={24} color="var(--danger)" className="animate-pulse" />
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.88rem' }}>Recording...</span>
                  <button className="btn btn-danger btn-sm" onClick={stopRecording}>
                    <Square size={13} /> Stop
                  </button>
                </>
              ) : (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mic size={24} color="var(--primary)" />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Tap to record</span>
                  <button className="btn btn-primary btn-sm" onClick={startRecording}>
                    <Mic size={13} /> Start Recording
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Upload */}
          <div>
            <p className="text-xs text-muted mb-8" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload file</p>
            <label className="upload-zone" style={{ minHeight: 160, cursor: 'pointer' }}>
              <Upload size={24} className="text-muted" />
              <span style={{ fontSize: '0.88rem' }}>Click to upload audio</span>
              <span className="upload-hint">MP3 · WAV · WebM · M4A</span>
              <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) { setAudioFile(e.target.files[0]); setRecordedBlob(null); } }} />
            </label>
          </div>
        </div>

        {audioFile && (
          <div className="flex items-center gap-10 mb-20" style={{ padding: '10px 14px', background: '#D1FAE5', borderRadius: 8, border: '1px solid #6EE7B7' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span style={{ fontSize: '0.88rem', color: '#065F46', flex: 1 }}>
              <strong>{audioFile.name}</strong> ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAudioFile(null); setRecordedBlob(null); }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <button className="btn btn-primary" disabled={!audioFile} onClick={() => setStep(3)}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  /* ── Step 3: Reports ── */
  if (step === 3) return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">New Consultation</div>
          <div className="page-head-sub">Step 3 of 4 — Upload clinical reports (optional)</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
      </div>
      <StepBar />

      <div className="card" style={{ maxWidth: 580 }}>
        <ReportSection
          label="Previous Reports"
          desc="Past lab results, imaging, prescriptions"
          color="#7C3AED"
          files={oldReports}
          onChange={setOldReports}
        />
        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
        <ReportSection
          label="Current Reports"
          desc="Today's lab results, new imaging"
          color="var(--success)"
          files={newReports}
          onChange={setNewReports}
        />

        <p className="text-xs text-muted mt-16" style={{ fontStyle: 'italic' }}>
          If no previous reports are uploaded, ScribeCare will automatically pull from the patient's last 3 consultations.
        </p>

        <button className="btn btn-primary mt-20" onClick={() => setStep(4)}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  /* ── Step 4: Template ── */
  if (step === 4) return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">New Consultation</div>
          <div className="page-head-sub">Step 4 of 4 — Choose note format</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setStep(3)}><ArrowLeft size={16} /> Back</button>
      </div>
      <StepBar />

      <div className="card" style={{ maxWidth: 580 }}>
        <h3 className="mb-20">Select Note Template</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {TEMPLATES.map((t) => (
            <div
              key={t.value}
              className="card card-hover card-sm"
              onClick={() => setTemplate(t.value)}
              style={{ border: template === t.value ? '1.5px solid var(--primary)' : '1px solid var(--border)', background: template === t.value ? 'var(--primary-soft)' : '#fff' }}
            >
              <div className="flex items-center gap-12">
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${template === t.value ? 'var(--primary)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {template === t.value && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{t.label}</div>
                  <div className="text-sm text-muted">{t.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
          <div className="text-xs text-muted mb-12" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consultation Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Patient', `${selectedPatient?.name} (${selectedPatient?.mrn})`],
              ['Audio',   audioFile?.name || '—'],
              ['Previous Reports', `${oldReports.length} file(s)`],
              ['Current Reports',  `${newReports.length} file(s)`],
              ['Template', TEMPLATES.find(t => t.value === template)?.label],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                <span className="text-muted">{k}</span>
                <span className="font-600">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-full mt-20" style={{ padding: '13px' }} onClick={handleProcess}>
          Generate Clinical Note
        </button>
      </div>
    </div>
  );

  /* ── Step 5: Processing ── */
  if (step === 5) return (
    <div className="page">
      <div className="processing-screen">
        <div className="spinner" style={{ width: 56, height: 56 }} />
        <div style={{ textAlign: 'center' }}>
          <h2>Processing Consultation</h2>
          <p className="text-muted mt-8">AI is transcribing and structuring your clinical note...</p>
        </div>
        <div className="process-steps">
          {PROCESS_STEPS.map((s, i) => (
            <div key={i} className={`process-step ${i < procStep ? 'done' : i === procStep ? 'active' : ''}`}>
              {i < procStep
                ? <CheckCircle2 size={16} />
                : i === procStep
                  ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border)' }} />}
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Step 6: Review ── */
  if (step === 6 && result) return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">Review & Approve Note</div>
          <div className="page-head-sub">Edit if needed, then approve to save</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to Dashboard</button>
          <button className="btn btn-primary" onClick={handleApprove}>
            <CheckCircle2 size={16} /> Approve & Save
          </button>
        </div>
      </div>

      <div className="split">
        {/* Transcript */}
        <div className="split-pane">
          <div className="split-pane-head">
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Transcript</span>
            <span className="badge badge-sky">Groq Whisper</span>
          </div>
          <div className="split-pane-body">
            <p style={{ fontSize: '0.88rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{result.transcript || 'No transcript available.'}</p>
          </div>
        </div>

        {/* Note */}
        <div className="split-pane">
          <div className="split-pane-head">
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Clinical Note (Editable)</span>
            <span className="badge badge-blue" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
              {TEMPLATES.find(t => t.value === template)?.label}
            </span>
          </div>
          <div className="split-pane-body">
            {editableNote && Object.entries(editableNote).map(([key, value]) => (
              <div key={key} className="mb-16">
                <label className="field" style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                </label>
                <textarea
                  className="input"
                  style={{ minHeight: 110, fontSize: '0.88rem', lineHeight: 1.7 }}
                  value={value}
                  onChange={(e) => setEditableNote({ ...editableNote, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-12 mt-20">
        <button className="btn btn-secondary" onClick={() => window.open(api.exportNotePdf(result.note_id), '_blank')}>
          Export PDF
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleApprove}>
          <CheckCircle2 size={18} /> Approve & Save Note
        </button>
      </div>
    </div>
  );

  return null;
}

/* ── Report Upload Section ── */
function ReportSection({ label, desc, color, files, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-8 mb-10">
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
          <div className="text-xs text-muted">{desc}</div>
        </div>
      </div>

      <label className="upload-zone" style={{ minHeight: 110, cursor: 'pointer' }}>
        <FileText size={20} className="text-muted" />
        <span style={{ fontSize: '0.85rem' }}>Click to upload</span>
        <span className="upload-hint">PDF · JPG · PNG</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => onChange((prev) => [...prev, ...Array.from(e.target.files)])}
        />
      </label>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-8" style={{ padding: '7px 12px', background: '#F8FAFC', borderRadius: 7, border: '1px solid var(--border)' }}>
              <FileText size={14} className="text-muted" />
              <span className="text-sm truncate" style={{ flex: 1 }}>{f.name}</span>
              <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
