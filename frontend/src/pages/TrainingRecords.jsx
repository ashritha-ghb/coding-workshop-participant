import React, { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Alert, CircularProgress, InputAdornment,
} from '@mui/material'
import { Add, Search } from '@mui/icons-material'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['enrolled', 'in_progress', 'completed', 'dropped']
const TYPES = ['course', 'workshop', 'certification', 'conference', 'mentoring', 'on_the_job']
const STATUS_COLORS = {
  enrolled: 'default', in_progress: 'primary', completed: 'success', dropped: 'error',
}

const EMPTY_FORM = {
  employee_id: '', training_name: '', training_type: '', provider: '',
  start_date: '', completion_date: '', status: 'enrolled', score: '',
  certificate_url: '', skills_gained: '', notes: '',
}

export default function TrainingRecords() {
  const { hasRole } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
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
      if (filterType) params.training_type = filterType
      const res = await api.get('/training-records', { params })
      let data = res.data.records || []
      if (search) {
        const q = search.toLowerCase()
        data = data.filter(r =>
          r.training_name?.toLowerCase().includes(q) ||
          r.provider?.toLowerCase().includes(q)
        )
      }
      setRecords(data)
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus, filterType])

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
      training_name: row.training_name || '',
      training_type: row.training_type || '',
      provider: row.provider || '',
      start_date: row.start_date?.split('T')[0] || '',
      completion_date: row.completion_date?.split('T')[0] || '',
      status: row.status || 'enrolled',
      score: row.score || '',
      certificate_url: row.certificate_url || '',
      skills_gained: row.skills_gained || '',
      notes: row.notes || '',
    })
    setFormErrors({})
    setApiError('')
    setDialogOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.employee_id) e.employee_id = 'Required'
    if (!form.training_name.trim()) e.training_name = 'Required'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      const payload = { ...form, score: form.score ? Number(form.score) : undefined }
      if (editing) {
        await api.put(`/training-records/${editing.id}`, payload)
      } else {
        await api.post('/training-records', payload)
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
      await api.delete(`/training-records/${deleteTarget.id}`)
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
    { key: 'training_name', label: 'Training' },
    { key: 'training_type', label: 'Type' },
    { key: 'provider', label: 'Provider' },
    {
      key: 'status', label: 'Status',
      render: v => <Chip label={v?.replace(/_/g, ' ')} size="small" color={STATUS_COLORS[v] || 'default'} />,
    },
    { key: 'completion_date', label: 'Completed', render: v => v?.split('T')[0] || '—' },
    { key: 'score', label: 'Score' },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Training Records</Typography>
        {hasRole('contributor') && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add Record
          </Button>
        )}
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          placeholder="Search by name or provider…"
          size="small" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select size="small" label="Status" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)} sx={{ width: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Type" value={filterType}
          onChange={e => setFilterType(e.target.value)} sx={{ width: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : (
        <DataTable
          columns={columns}
          rows={records}
          onEdit={hasRole('contributor') ? openEdit : undefined}
          onDelete={hasRole('manager') ? row => setDeleteTarget(row) : undefined}
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Training Record' : 'Add Training Record'}</DialogTitle>
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
                select label="Type" fullWidth size="small"
                value={form.training_type}
                onChange={e => setForm(p => ({ ...p, training_type: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Training Name" fullWidth size="small"
                value={form.training_name}
                onChange={e => setForm(p => ({ ...p, training_name: e.target.value }))}
                error={Boolean(formErrors.training_name)} helperText={formErrors.training_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Provider" fullWidth size="small"
                value={form.provider}
                onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
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
                label="Start Date" fullWidth size="small" type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Completion Date" fullWidth size="small" type="date"
                value={form.completion_date}
                onChange={e => setForm(p => ({ ...p, completion_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Score" fullWidth size="small" type="number"
                value={form.score}
                onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Certificate URL" fullWidth size="small"
                value={form.certificate_url}
                onChange={e => setForm(p => ({ ...p, certificate_url: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Skills Gained" fullWidth size="small" multiline rows={2}
                value={form.skills_gained}
                onChange={e => setForm(p => ({ ...p, skills_gained: e.target.value }))}
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
        title="Delete Training Record"
        message={`Remove "${deleteTarget?.training_name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Box>
  )
}
