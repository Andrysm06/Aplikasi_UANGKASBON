import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Kasbon from './pages/Kasbon';
import KasbonDetail from './pages/KasbonDetail';
import Kas from './pages/Kas';
import Karyawan from './pages/Karyawan';
import UnitStok from './pages/UnitStok';
import Setting from './pages/Setting';

// Protected Route Wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '12px'
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="kasbon" element={<Kasbon />} />
            <Route path="kasbon/:id" element={<KasbonDetail />} />
            <Route path="unit-stok" element={<UnitStok />} />
            
            {/* Admin & Approver */}
            <Route path="kas" element={
              <ProtectedRoute roles={['admin', 'approver']}><Kas /></ProtectedRoute>
            } />
            <Route path="karyawan" element={
              <ProtectedRoute roles={['admin', 'approver']}><Karyawan /></ProtectedRoute>
            } />
            <Route path="setting" element={
              <ProtectedRoute roles={['admin', 'approver']}><Setting /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
