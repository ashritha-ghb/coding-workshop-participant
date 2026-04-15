import React, { useState } from 'react'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, MenuItem, Link,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const ROLES = ['viewer', 'contributor', 'manager', 'admin']

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
      await api.post('/auth/register', {
        ...form,
        email: form.email.trim().toLowerCase(),
      })
      navigate('/login')
    } catch (err) {
      setApiError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }))
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
      <Card sx={{ width: '100%', maxWidth: 420, mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom align="center">Create Account</Typography>
          <Typography variant="body2" color="text.secondary" align="center" mb={3}>
            ACME HR Platform
          </Typography>

          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Full Name" fullWidth margin="normal"
              value={form.full_name} onChange={handleChange('full_name')}
              error={Boolean(errors.full_name)} helperText={errors.full_name}
              autoFocus
            />
            <TextField
              label="Email" type="email" fullWidth margin="normal"
              value={form.email} onChange={handleChange('email')}
              error={Boolean(errors.email)} helperText={errors.email}
            />
            <TextField
              label="Password" type="password" fullWidth margin="normal"
              value={form.password} onChange={handleChange('password')}
              error={Boolean(errors.password)} helperText={errors.password}
            />
            <TextField
              select label="Role" fullWidth margin="normal"
              value={form.role} onChange={handleChange('role')}
            >
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <Button
              type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
            <Box textAlign="center" mt={2}>
              <Link component="button" variant="body2" onClick={() => navigate('/login')}>
                Already have an account? Sign in
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
