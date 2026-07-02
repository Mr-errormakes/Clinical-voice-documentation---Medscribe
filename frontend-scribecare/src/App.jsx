import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar  from './components/TopBar';
import LoginPage       from './pages/Login';
import Dashboard       from './pages/Dashboard';
import Patients        from './pages/Patients';
import NewConsultation from './pages/NewConsultation';
import MyNotes         from './pages/MyNotes';
import SettingsPage    from './pages/Settings';

function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route element={<AppLayout />}>
            <Route path="/"                 element={<Dashboard />} />
            <Route path="/patients"         element={<Patients />} />
            <Route path="/consultation/new" element={<NewConsultation />} />
            <Route path="/notes"            element={<MyNotes />} />
            <Route path="/settings"         element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
