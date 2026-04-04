import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Commission from './pages/Commission';
import MarketingDashboard from './pages/MarketingDashboard';
import MarketingForms from './pages/MarketingForms';
import Gallery from './pages/Gallery';
import EmergentFixes from './pages/EmergentFixes';
import Settings from './pages/Settings';
import WorkflowBuilder from './pages/WorkflowBuilder';
import MarketingPanel from './pages/MarketingPanel';
import FloatingChatButton from './components/FloatingChatButton';
import { Toaster } from './components/ui/sonner';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const BrandingContext = React.createContext({
  companyName: 'Revival Fitness',
  appName: 'XAC CRM'
});

function App() {
  const [user, setUser] = React.useState(null);
  const [branding, setBranding] = React.useState({ companyName: 'Revival Fitness', appName: 'XAC CRM' });

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    // Load branding from settings
    const loadBranding = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/branding`);
        if (res.data) {
          setBranding({
            companyName: res.data.company_name || 'Revival Fitness',
            appName: res.data.app_name || 'XAC CRM'
          });
        }
      } catch { /* use defaults */ }
    };
    loadBranding();
  }, []);

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" replace />;
  };

  return (
    <BrandingContext.Provider value={branding}>
    <Router>
      <Toaster position="top-right" richColors />
      <FloatingChatButton user={user} type="emergent" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
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
          path="/marketing"
          element={
            <ProtectedRoute>
              <MarketingDashboard user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing/forms"
          element={
            <ProtectedRoute>
              <MarketingForms user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <Gallery user={user} />
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
        <Route
          path="/workflows"
          element={
            <ProtectedRoute>
              <WorkflowBuilder user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing-panel"
          element={
            <ProtectedRoute>
              <MarketingPanel user={user} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
    </BrandingContext.Provider>
  );
}

export default App;
