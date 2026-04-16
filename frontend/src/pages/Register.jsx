import React, { useState } from 'react'
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, MenuItem, Link, Divider,
} from '@mui/material'
import { PersonAddOutlined } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const ROLES = [
  { value: 'viewer', label: 'Viewer — read-only access' },
  { value: 'contributor', label: 'Contributor — create & update' },
  { value: 'manager', label: 'Manager — full management access' },
  { value: 'admin', label: 'Admin — full access' },
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'viewer' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setApiError('')
    try {
      await api.post('/auth/register', { ...form, email: form.email.trim().toLowerCase() })
      navigate('/login')
    } catch (err) {
      setApiError(err.response?.data?.error || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const set = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }))
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '45%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(145deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)',
          px: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 250, height: 250, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'relative', textAlign: 'center', color: 'white' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <PersonAddOutlined sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Typography variant="h4" fontWeight={700} mb={2}>Join ACME HR</Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, lineHeight: 1.8, maxWidth: 320 }}>
            Create your account to access the employee performance and development platform.
          </Typography>
          <Box sx={{ mt: 5, p: 3, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, textAlign: 'left' }}>
            <Typography variant="body2" color="white" fontWeight={600} mb={1.5}>Role permissions</Typography>
            {[
              ['Viewer', 'Read-only access to own records'],
              ['Contributor', 'Create and update records'],
              ['Manager', 'Manage employees and all records'],
              ['Admin', 'Full access including user management'],
            ].map(([role, desc]) => (
              <Box key={role} mb={1}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{role}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', display: 'block' }}>{desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#f8fafc',
          px: { xs: 3, sm: 6, md: 8 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>Create account</Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Fill in your details to get started
          </Typography>

          {apiError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{apiError}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Full name" fullWidth sx={{ mb: 2.5 }}
              value={form.full_name} onChange={set('full_name')}
              error={Boolean(errors.full_name)} helperText={errors.full_name}
              autoFocus
            />
            <TextField
              label="Email address" type="email" fullWidth sx={{ mb: 2.5 }}
              value={form.email} onChange={set('email')}
              error={Boolean(errors.email)} helperText={errors.email}
            />
            <TextField
              label="Password" type="password" fullWidth sx={{ mb: 2.5 }}
              value={form.password} onChange={set('password')}
              error={Boolean(errors.password)} helperText={errors.password || 'Minimum 8 characters'}
            />
            <TextField
              select label="Role" fullWidth sx={{ mb: 3 }}
              value={form.role} onChange={set('role')}
            >
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              sx={{ py: 1.5, fontSize: '0.95rem', borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">or</Typography>
          </Divider>

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component="button" variant="body2" fontWeight={600}
                onClick={() => navigate('/login')}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
