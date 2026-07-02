const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseUrl = API_URL;
    this.token = localStorage.getItem('scribecare_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('scribecare_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('scribecare_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  signup(data) {
    return this.request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) });
  }

  login(data) {
    return this.request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }

  getMe() {
    return this.request('/api/auth/me');
  }

  // Patients
  getPatients(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/api/patients/${query}`);
  }

  createPatient(data) {
    return this.request('/api/patients/', { method: 'POST', body: JSON.stringify(data) });
  }

  getPatient(id) {
    return this.request(`/api/patients/${id}`);
  }

  getPatientDetails(id) {
    return this.request(`/api/patients/${id}/details`);
  }

  // Consultations
  createConsultation(data) {
    return this.request('/api/consultations/', { method: 'POST', body: JSON.stringify(data) });
  }

  uploadAudio(consultationId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/api/consultations/${consultationId}/upload-audio`, {
      method: 'POST',
      body: formData,
    });
  }

  uploadReports(consultationId, files, reportType = 'new') {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('report_type', reportType);
    return this.request(`/api/consultations/${consultationId}/upload-reports`, {
      method: 'POST',
      body: formData,
    });
  }

  processConsultation(consultationId, template = 'soap') {
    return this.request(`/api/consultations/${consultationId}/process?template=${template}`, { method: 'POST' });
  }

  getConsultation(id) {
    return this.request(`/api/consultations/${id}`);
  }

  // Notes
  getNotes() {
    return this.request('/api/notes/');
  }

  getNote(id) {
    return this.request(`/api/notes/${id}`);
  }

  updateNote(id, content) {
    return this.request(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify({ content }) });
  }

  approveNote(id) {
    return this.request(`/api/notes/${id}/approve`, { method: 'PUT' });
  }

  exportNotePdf(id) {
    return `${this.baseUrl}/api/notes/${id}/pdf`;
  }

  getPatientNotes(patientId) {
    return this.request(`/api/notes/patient/${patientId}`);
  }

  // Dashboard
  getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  // ── Vitals (EMR secondary readings) ──────────────────────────
  getVitals(patientId) {
    return this.request(`/api/patients/${patientId}/vitals`);
  }

  addVital(patientId, data) {
    return this.request(`/api/patients/${patientId}/vitals`, {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  deleteVital(patientId, vitalId) {
    return this.request(`/api/patients/${patientId}/vitals/${vitalId}`, { method: 'DELETE' });
  }

  // ── Medications ───────────────────────────────────────────────
  getMedications(patientId) {
    return this.request(`/api/patients/${patientId}/medications`);
  }

  addMedication(patientId, data) {
    return this.request(`/api/patients/${patientId}/medications`, {
      method: 'POST', body: JSON.stringify(data),
    });
  }

  updateMedication(patientId, medId, data) {
    return this.request(`/api/patients/${patientId}/medications/${medId}`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  discontinueMedication(patientId, medId, data) {
    return this.request(`/api/patients/${patientId}/medications/${medId}/discontinue`, {
      method: 'PUT', body: JSON.stringify(data),
    });
  }

  reactivateMedication(patientId, medId) {
    return this.request(`/api/patients/${patientId}/medications/${medId}/reactivate`, {
      method: 'PUT', body: JSON.stringify({}),
    });
  }

  deleteMedication(patientId, medId) {
    return this.request(`/api/patients/${patientId}/medications/${medId}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;
