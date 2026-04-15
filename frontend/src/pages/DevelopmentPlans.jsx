import React, { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Alert, CircularProgress, LinearProgress, InputAdornment,
} from '@mui/material'
import { Add, Search } from '@mui/icons-material'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['not_started', 'in_progress', 'completed', 'on_hold']
const STATUS_COLORS = {
  not_started: 'default', in_progress: 'primary', completed: 'success', on_hold: 'warning',
}

const EMPTY_FORM = {
  employee_id: '', title: '', description: '', target_role: '',
  start_date: '', target_date: '', status: 'not_started', progress_pct: 0, milestones: '',
}

export default function DevelopmentPlans() {
  const { hasRole } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
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
      const params = {}
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/development-plans', { params })
      let data = res.data.plans || []
      if (search) {
        const q = search.toLowerCase()
        data = data.filter(p => p.title?.toLowerCase().includes(q) || p.target_role?.toLowerCase().includes(q))
      }
      setPlans(data)
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus])

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
      employee_id: row.employee_id || '',
      title: row.title || '',
      description: row.description || '',
      target_role: row.target_role || '',
      start_date: row.start_date?.split('T')[0] || '',
      target_date: row.target_date?.split('T')[0] || '',
      status: row.status || 'not_started',
      progress_pct: row.progress_pct ?? 0,
      milestones: row.milestones || '',
    })
    setFormErrors({})
    setApiError('')
    setDialogOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.employee_id) e.employee_id = 'Required'
    if (!form.title.trim()) e.title = 'Required'
    const pct = Number(form.progress_pct)
    if (isNaN(pct) || pct < 0 || pct > 100) e.progress_pct = 'Must be 0–100'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      const payload = { ...form, progress_pct: Number(form.progress_pct) }
      if (editing) {
        await api.put(`/development-plans/${editing.id}`, payload)
      } else {
        await api.post('/development-plans', payload)
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
      await api.delete(`/development-plans/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch {
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'title', label: 'Title' },
    { key: 'target_role', label: 'Target Role' },
    {
      key: 'status', label: 'Status',
      render: v => <Chip label={v?.replace(/_/g, ' ')} size="small" color={STATUS_COLORS[v] || 'default'} />,
    },
    {
      key: 'progress_pct', label: 'Progress',
      render: v => (
        <Box display="flex" alignItems="center" gap={1} minWidth={100}>
          <LinearProgress variant="determinate" value={v || 0} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
          <Typography variant="caption">{v || 0}%</Typography>
        </Box>
      ),
    },
    { key: 'target_date', label: 'Target Date', render: v => v?.split('T')[0] || '—' },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Development Plans</Typography>
        {hasRole('contributor') && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            New Plan
          </Button>
        )}
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          placeholder="Search by title or target role…"
          size="small" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select size="small" label="Status" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)} sx={{ width: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : (
        <DataTable
          columns={columns}
          rows={plans}
          onEdit={hasRole('contributor') ? openEdit : undefined}
          onDelete={hasRole('manager') ? row => setDeleteTarget(row) : undefined}
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Plan' : 'New Development Plan'}</DialogTitle>
        <DialogContent>
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
          <Grid container spacing={2} mt={0.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Employee ID" fullWidth size="small" type="number"
                value={form.employee_id}
                onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                error={Boolean(formErrors.employee_id)} helperText={formErrors.employee_id}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Target Role" fullWidth size="small"
                value={form.target_role}
                onChange={e => setForm(p => ({ ...p, target_role: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Title" fullWidth size="small"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                error={Boolean(formErrors.title)} helperText={formErrors.title}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description" fullWidth size="small" multiline rows={2}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date" fullWidth size="small" type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Target Date" fullWidth size="small" type="date"
                value={form.target_date}
                onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select label="Status" fullWidth size="small"
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              >
                {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Progress %" fullWidth size="small" type="number"
                inputProps={{ min: 0, max: 100 }}
                value={form.progress_pct}
                onChange={e => setForm(p => ({ ...p, progress_pct: e.target.value }))}
                error={Boolean(formErrors.progress_pct)} helperText={formErrors.progress_pct}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Milestones" fullWidth size="small" multiline rows={2}
                value={form.milestones}
                onChange={e => setForm(p => ({ ...p, milestones: e.target.value }))}
              />
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
        title="Delete Plan"
        message="Delete this development plan? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Box>
  )
}
