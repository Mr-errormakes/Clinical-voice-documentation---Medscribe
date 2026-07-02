import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { User, Mail, Lock, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="main-content fade-in">
            <div className="page-header">
                <h1>Settings</h1>
            </div>

            <div style={{ maxWidth: 520 }}>
                {/* Profile */}
                <div className="card mb-24">
                    <h3 className="mb-16">Profile</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <div className="input-with-icon">
                                <User size={18} className="input-icon" />
                                <input className="input" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <div className="input-with-icon">
                                <Mail size={18} className="input-icon" />
                                <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Role</label>
                            <input className="input" value={user?.role === 'admin' ? 'Hospital Admin' : 'Clinician'} disabled style={{ opacity: 0.6 }} />
                        </div>
                        <div className="input-group">
                            <label>Organization</label>
                            <input className="input" value={user?.org_name || 'Demo Hospital'} disabled style={{ opacity: 0.6 }} />
                        </div>

                        <button className="btn btn-primary" onClick={handleSave}>
                            {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> Save Changes</>}
                        </button>
                    </div>
                </div>

                {/* Password */}
                <div className="card">
                    <h3 className="mb-16">Change Password</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="input-group">
                            <label>Current Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input className="input" type="password" placeholder="••••••••" />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>New Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input className="input" type="password" placeholder="••••••••" />
                            </div>
                        </div>
                        <button className="btn btn-secondary">Update Password</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
