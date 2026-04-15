import React, { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Button, TextField, InputAdornment, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, MenuItem, Alert, CircularProgress,
} from '@mui/material'
import { Add, Search } from '@mui/icons-material'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = { active: 'success', inactive: 'default', terminated: 'error' }

const EMPTY_FORM = {
  employee_code: '', full_name: '', email: '', department: '',
  job_title: '', hire_date: '', employment_status: 'active',
}

export default function Employees() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const res = await api.get('/employees', { params })
      setEmployees(res.data.employees || [])
    } catch {
      // silently fail — table shows empty state
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setApiError('')
    setDialogOpen(true)
  }

  const openEdit = row => {
    setEditing(row)
    setForm({
      employee_code: row.employee_code || '',
      full_name: row.full_name || '',
      email: row.email || '',
      department: row.department || '',
      job_title: row.job_title || '',
      hire_date: row.hire_date?.split('T')[0] || '',
      employment_status: row.employment_status || 'active',
    })
    setFormErrors({})
    setApiError('')
    setDialogOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.employee_code.trim()) e.employee_code = 'Required'
    if (!form.full_name.trim()) e.full_name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, form)
      } else {
        await api.post('/employees', form)
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      setApiError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/employees/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch {
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'employee_code', label: 'Code' },
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'job_title', label: 'Title' },
    {
      key: 'employment_status', label: 'Status',
      render: v => <Chip label={v} size="small" color={STATUS_COLORS[v] || 'default'} />,
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Employees</Typography>
        {hasRole('manager') && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add Employee
          </Button>
        )}
      </Box>

      <TextField
        placeholder="Search by name, email, or code…"
        size="small"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 320 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : (
        <DataTable
          columns={columns}
          rows={employees}
          onEdit={hasRole('manager') ? openEdit : undefined}
          onDelete={hasRole('admin') ? row => setDeleteTarget(row) : undefined}
        />
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent>
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
          <Grid container spacing={2} mt={0.5}>
            {[
              { field: 'employee_code', label: 'Employee Code', disabled: Boolean(editing) },
              { field: 'full_name', label: 'Full Name' },
              { field: 'email', label: 'Email', type: 'email' },
              { field: 'department', label: 'Department' },
              { field: 'job_title', label: 'Job Title' },
              { field: 'hire_date', label: 'Hire Date', type: 'date', shrink: true },
            ].map(({ field, label, type = 'text', disabled, shrink }) => (
              <Grid item xs={12} sm={6} key={field}>
                <TextField
                  label={label}
                  type={type}
                  fullWidth
                  size="small"
                  disabled={disabled}
                  value={form[field]}
                  onChange={e => {
                    setForm(p => ({ ...p, [field]: e.target.value }))
                    if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: '' }))
                  }}
                  error={Boolean(formErrors[field])}
                  helperText={formErrors[field]}
                  InputLabelProps={shrink ? { shrink: true } : undefined}
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Status"
                value={form.employment_status}
                onChange={e => setForm(p => ({ ...p, employment_status: e.target.value }))}
              >
                {['active', 'inactive', 'terminated'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Employee"
        message={`Remove ${deleteTarget?.full_name}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Box>
  )
}
