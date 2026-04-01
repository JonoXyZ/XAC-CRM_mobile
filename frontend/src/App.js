import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Commission from './pages/Commission';
import EmergentFixes from './pages/EmergentFixes';
import Settings from './pages/Settings';
import FloatingChatButton from './components/FloatingChatButton';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/" replace />;
  };

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <FloatingChatButton user={user} type="emergent" />
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leads"
          element={
            <ProtectedRoute>
              <Leads user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <Appointments user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergent-fixes"
          element={
            <ProtectedRoute>
              <EmergentFixes user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/commission"
          element={
            <ProtectedRoute>
              <Commission user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings user={user} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
