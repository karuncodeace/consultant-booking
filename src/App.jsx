import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import RoleGuard from './components/RoleGuard'
import Login from './pages/Login'
import { Toaster } from 'react-hot-toast'

import SalesDashboard from './pages/SalesDashboard'
import ConsultantDashboard from './pages/ConsultantDashboard'
import AdminDashboard from './pages/AdminDashboard'

import { NotificationProvider } from './contexts/NotificationContext'
import { useEffect } from 'react'
import { requestFCMPermission } from './firebase'   // ← IMPORTANT

const HomeRedirect = () => {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'consultant') return <Navigate to="/consultant" replace />
  if (profile?.role === 'sales') return <Navigate to="/sales" replace />
  return <Navigate to="/login" replace />
}

function App() {
  useEffect(() => {
    requestPermissionAndToken();
  }, []);


  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RoleGuard allowedRoles={['sales']} />}>
              <Route path="/sales" element={<SalesDashboard />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['consultant']} />}>
              <Route path="/consultant" element={<ConsultantDashboard />} />
            </Route>

            <Route element={<RoleGuard allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>

          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#fff',
                color: '#333',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
