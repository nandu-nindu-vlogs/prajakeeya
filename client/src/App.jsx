import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { theme } from './theme';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import PublicTransparency from './pages/PublicTransparency';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SubmitApplication from './pages/SubmitApplication';
import FileDetail from './pages/FileDetail';
import FilesList from './pages/FilesList';
import Beneficiaries from './pages/Beneficiaries';
import Procurement from './pages/Procurement';
import Finance from './pages/Finance';
import LedgerPage from './pages/LedgerPage';
import Grievances from './pages/Grievances';
import GrievanceDetail from './pages/GrievanceDetail';
import Documents from './pages/Documents';
import Analytics from './pages/Analytics';
import Projects from './pages/Projects';
import ContractorDashboard from './pages/ContractorDashboard';
import FraudAnalysis from './pages/FraudAnalysis';

function DashboardRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'citizen')    return <CitizenDashboard />;
  if (user.role === 'officer')    return <OfficerDashboard />;
  if (user.role === 'contractor') return <ContractorDashboard />;
  return <AdminDashboard />; // admin + auditor
}

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOrAuth({ children }) {
  // accessible whether logged in or not
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      {/* Public standalone pages (no sidebar) */}
      <Route path="/login"    element={!user ? <Login />    : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />

      {/* All app pages inside Layout (sidebar) */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/dashboard"    element={<DashboardRoute />} />
        <Route path="/files"        element={<FilesList />} />
        <Route path="/files/:id"    element={<FileDetail />} />
        <Route path="/submit"       element={<RequireAuth roles={['citizen']}><SubmitApplication /></RequireAuth>} />
        <Route path="/beneficiaries" element={<RequireAuth roles={['officer','admin','auditor']}><Beneficiaries /></RequireAuth>} />
        <Route path="/finance"      element={<RequireAuth roles={['officer','admin','auditor']}><Finance /></RequireAuth>} />
        <Route path="/procurement"  element={<Procurement />} />
        <Route path="/ledger"       element={<RequireAuth roles={['admin','auditor']}><LedgerPage /></RequireAuth>} />
        <Route path="/grievances"   element={<Grievances />} />
        <Route path="/grievances/:id" element={<GrievanceDetail />} />
        <Route path="/documents"    element={<Documents />} />
        <Route path="/analytics"    element={<RequireAuth roles={['officer','admin','auditor']}><Analytics /></RequireAuth>} />
        <Route path="/projects"     element={<Projects />} />
        <Route path="/public"       element={<PublicTransparency />} />
        <Route path="/fraud"        element={<RequireAuth roles={['admin','auditor']}><FraudAnalysis /></RequireAuth>} />
        <Route path="/contractor"   element={<RequireAuth roles={['contractor']}><ContractorDashboard /></RequireAuth>} />
      </Route>

      <Route path="/"  element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*"  element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
