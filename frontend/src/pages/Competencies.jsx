import React, { useEffect, useState, useCallback } from 'react'
import {
  Box, Typography, Button, TextField, MenuItem, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Alert, CircularProgress, InputAdornment, Rating,
} from '@mui/material'
import { Add, Search, Warning } from '@mui/icons-material'
import DataTable from '../components/DataTable'
import ConfirmDialog from '../components/ConfirmDialog'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['technical', 'leadership', 'communication', 'analytical', 'interpersonal', 'domain']

const EMPTY_FORM = {
  employee_id: '', skill_name: '', category: '', current_level: 3, target_level: '', notes: '',
}

export default function Competencies() {
  const { hasRole } = useAuth()
  const [competencies, setCompetencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [gapsOnly, setGapsOnly] = useState(false)
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
      if (filterCategory) params.category = filterCategory
      if (gapsOnly) params.has_gap = 'true'
      const res = await api.get('/competencies', { params })
      let data = res.data.competencies || []
      if (search) {
        const q = search.toLowerCase()
        data = data.filter(c => c.skill_name?.toLowerCase().includes(q))
      }
      setCompetencies(data)
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory, gapsOnly])

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
      skill_name: row.skill_name || '',
      category: row.category || '',
      current_level: row.current_level || 3,
      target_level: row.target_level || '',
      notes: row.notes || '',
    })
    setFormErrors({})
    setApiError('')
    setDialogOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.employee_id) e.employee_id = 'Required'
    if (!form.skill_name.trim()) e.skill_name = 'Required'
    if (!form.current_level) e.current_level = 'Required'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      const payload = {
        ...form,
        current_level: Number(form.current_level),
        target_level: form.target_level ? Number(form.target_level) : undefined,
      }
      if (editing) {
        await api.put(`/competencies/${editing.id}`, payload)
      } else {
        await api.post('/competencies', payload)
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
      await api.delete(`/competencies/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch {
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const LEVEL_LABELS = { 1: 'Beginner', 2: 'Developing', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' }

  const columns = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'skill_name', label: 'Skill' },
    { key: 'category', label: 'Category' },
    {
      key: 'current_level', label: 'Current',
      render: v => <Chip label={LEVEL_LABELS[v] || v} size="small" />,
    },
    {
      key: 'target_level', label: 'Target',
      render: v => v ? <Chip label={LEVEL_LABELS[v] || v} size="small" variant="outlined" /> : '—',
    },
    {
      key: 'gap', label: 'Gap',
      render: v => v > 0
        ? <Chip icon={<Warning />} label={`${v} level${v > 1 ? 's' : ''}`} size="small" color="warning" />
        : <Chip label="None" size="small" color="success" />,
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Competencies</Typography>
        {hasRole('contributor') && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add Competency
          </Button>
        )}
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          placeholder="Search by skill…"
          size="small" value={search}
          onChange={e => setSearch(e.target.value)} sx={{ width: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select size="small" label="Category" value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)} sx={{ width: 180 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <Button
          variant={gapsOnly ? 'contained' : 'outlined'}
          size="small"
          color="warning"
          onClick={() => setGapsOnly(p => !p)}
          startIcon={<Warning />}
        >
          Gaps only
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : (
        <DataTable
          columns={columns}
          rows={competencies}
          onEdit={hasRole('contributor') ? openEdit : undefined}
          onDelete={hasRole('manager') ? row => setDeleteTarget(row) : undefined}
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Competency' : 'Add Competency'}</DialogTitle>
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
                select label="Category" fullWidth size="small"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Skill Name" fullWidth size="small"
                value={form.skill_name}
                onChange={e => setForm(p => ({ ...p, skill_name: e.target.value }))}
                error={Boolean(formErrors.skill_name)} helperText={formErrors.skill_name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Current Level</Typography>
              <Box mt={0.5}>
                <Rating
                  max={5}
                  value={Number(form.current_level)}
                  onChange={(_, v) => setForm(p => ({ ...p, current_level: v || 1 }))}
                />
                <Typography variant="caption" ml={1}>{LEVEL_LABELS[form.current_level]}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Target Level (optional)</Typography>
              <Box mt={0.5}>
                <Rating
                  max={5}
                  value={Number(form.target_level) || 0}
                  onChange={(_, v) => setForm(p => ({ ...p, target_level: v || '' }))}
                />
                {form.target_level && (
                  <Typography variant="caption" ml={1}>{LEVEL_LABELS[form.target_level]}</Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes" fullWidth size="small" multiline rows={2}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
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
        title="Delete Competency"
        message={`Remove "${deleteTarget?.skill_name}" record? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Box>
  )
}
