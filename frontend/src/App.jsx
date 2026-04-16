import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Unauthorized from './pages/Unauthorized'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import PerformanceReviews from './pages/PerformanceReviews'
import DevelopmentPlans from './pages/DevelopmentPlans'
import Competencies from './pages/Competencies'
import TrainingRecords from './pages/TrainingRecords'

function PrivateRoute({ children, minRole }) {
  const { user, loading, hasRole } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (!user) return <Navigate to="/" replace />
  if (minRole && !hasRole(minRole)) return <Navigate to="/unauthorized" replace />

  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<PrivateRoute minRole="manager"><Employees /></PrivateRoute>} />
        <Route path="employees/:id" element={<PrivateRoute><EmployeeDetail /></PrivateRoute>} />
        <Route path="reviews" element={<PrivateRoute><PerformanceReviews /></PrivateRoute>} />
        <Route path="plans" element={<PrivateRoute><DevelopmentPlans /></PrivateRoute>} />
        <Route path="competencies" element={<PrivateRoute><Competencies /></PrivateRoute>} />
        <Route path="training" element={<PrivateRoute><TrainingRecords /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
