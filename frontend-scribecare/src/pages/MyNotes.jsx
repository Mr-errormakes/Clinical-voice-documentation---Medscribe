import { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, CheckCircle2, Clock, Search, ChevronDown, ChevronUp, Download } from 'lucide-react';

const NOTE_COLORS = {
  chief_complaint:         { color: '#2563EB', bg: '#EFF6FF' },
  history_of_present_illness: { color: '#7C3AED', bg: '#EDE9FE' },
  assessment:              { color: '#D97706', bg: '#FEF3C7' },
  plan:                    { color: '#059669', bg: '#D1FAE5' },
  clinical_findings:       { color: '#2563EB', bg: '#EFF6FF' },
  diagnosis:               { color: '#D97706', bg: '#FEF3C7' },
  medication_prescribed:   { color: '#7C3AED', bg: '#EDE9FE' },
  advice:                  { color: '#059669', bg: '#D1FAE5' },
  presentation:            { color: '#2563EB', bg: '#EFF6FF' },
  vitals:                  { color: '#0EA5E9', bg: '#E0F2FE' },
  investigations:          { color: '#D97706', bg: '#FEF3C7' },
  treatment_plan:          { color: '#059669', bg: '#D1FAE5' },
};

export default function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.getNotes();
      setNotes(Array.isArray(data) ? data : []);
    } catch { setNotes([]); } finally { setLoading(false); }
  };

  const filtered = notes.filter((n) => {
    if (filter !== 'all' && n.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (n.patient?.name || '').toLowerCase().includes(s)
        || (n.patient?.mrn || '').toLowerCase().includes(s)
        || (n.transcript || '').toLowerCase().includes(s);
    }
    return true;
  });

  const approveNote = async (id) => {
    try {
      await api.approveNote(id);
      loadNotes();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page fade-in">
      <div className="page-head">
        <div>
          <div className="page-head-title">My Notes</div>
          <div className="page-head-sub">{notes.length} total notes</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-12 mb-20" style={{ flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ maxWidth: 340, flex: 1 }}>
          <Search size={16} className="search-icon" />
          <input className="input" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-8">
          {[
            { key: 'all',      label: 'All' },
            { key: 'draft',    label: 'Drafts' },
            { key: 'approved', label: 'Approved' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((note) => {
            const expanded = expandedId === note.id;
            return (
              <div
                key={note.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden', border: expanded ? '1.5px solid var(--primary-border)' : undefined }}
              >
                {/* Header row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(expanded ? null : note.id)}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                    <FileText size={17} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-8" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                      <span className="font-600" style={{ fontSize: '0.92rem' }}>{note.patient?.name || 'Unknown'}</span>
                      {note.patient?.mrn && <span className="badge badge-sky">{note.patient.mrn}</span>}
                      <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
                        {note.template || 'soap'}
                      </span>
                    </div>
                    <div className="text-sm text-muted truncate">
                      {note.transcript?.substring(0, 90) || 'No transcript'}...
                    </div>
                  </div>

                  <div className="flex items-center gap-10" style={{ flexShrink: 0 }}>
                    <span className={`badge ${note.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                      {note.status === 'approved'
                        ? <><CheckCircle2 size={11} /> Approved</>
                        : <><Clock size={11} /> Draft</>}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    {expanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  </div>
                </div>

                {/* Expanded content */}
                {expanded && (
                  <div className="fade-in" style={{ borderTop: '1px solid var(--border)', padding: '20px 18px' }}>
                    {/* Note fields */}
                    {note.note_content && Object.entries(note.note_content).map(([key, value]) => {
                      const style = NOTE_COLORS[key] || { color: '#475569', bg: '#F1F5F9' };
                      return (
                        <div
                          key={key}
                          className="note-section"
                          style={{ borderLeftColor: style.color, background: style.bg + '80' }}
                        >
                          <div className="note-section-label" style={{ color: style.color }}>
                            {key.replace(/_/g, ' ')}
                          </div>
                          <p style={{ fontSize: '0.88rem', lineHeight: 1.75, whiteSpace: 'pre-line', color: '#1E293B' }}>
                            {value || '—'}
                          </p>
                        </div>
                      );
                    })}

                    {/* Actions */}
                    <div className="flex gap-10 mt-16">
                      {note.status === 'draft' && (
                        <button className="btn btn-primary btn-sm" onClick={() => approveNote(note.id)}>
                          <CheckCircle2 size={14} /> Approve Note
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => window.open(api.exportNotePdf(note.id), '_blank')}
                      >
                        <Download size={14} /> Export PDF
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(null)}>
                        Collapse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty card">
          <FileText size={40} />
          <h3>No notes found</h3>
          <p>{search || filter !== 'all' ? 'Try adjusting your search or filters' : 'Generate your first note from a consultation'}</p>
        </div>
      )}
    </div>
  );
}
