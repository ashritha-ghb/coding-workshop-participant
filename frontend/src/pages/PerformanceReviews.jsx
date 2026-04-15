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

const RATINGS = ['exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
const RATING_COLORS = {
  exceeds_expectations: 'success',
  meets_expectations: 'primary',
  needs_improvement: 'warning',
  unsatisfactory: 'error',
}
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'annual', 'mid-year']

const EMPTY_FORM = {
  employee_id: '', review_period: 'Q4', review_year: new Date().getFullYear(),
  overall_rating: '', strengths: '', areas_to_improve: '', goals_next_period: '',
  score: '', status: 'draft',
}

export default function PerformanceReviews() {
  const { hasRole } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRating, setFilterRating] = useState('')
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
      if (filterRating) params.rating = filterRating
      const res = await api.get('/performance-reviews', { params })
      let data = res.data.reviews || []
      if (search) {
        const q = search.toLowerCase()
        data = data.filter(r =>
          String(r.employee_id).includes(q) ||
          r.review_period?.toLowerCase().includes(q) ||
          String(r.review_year).includes(q)
        )
      }
      setReviews(data)
    } finally {
      setLoading(false)
    }
  }, [search, filterRating])

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
      review_period: row.review_period || 'Q4',
      review_year: row.review_year || new Date().getFullYear(),
      overall_rating: row.overall_rating || '',
      strengths: row.strengths || '',
      areas_to_improve: row.areas_to_improve || '',
      goals_next_period: row.goals_next_period || '',
      score: row.score || '',
      status: row.status || 'draft',
    })
    setFormErrors({})
    setApiError('')
    setDialogOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.employee_id) e.employee_id = 'Required'
    if (!form.overall_rating) e.overall_rating = 'Required'
    if (!form.review_period) e.review_period = 'Required'
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
        await api.put(`/performance-reviews/${editing.id}`, payload)
      } else {
        await api.post('/performance-reviews', payload)
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
      await api.delete(`/performance-reviews/${deleteTarget.id}`)
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
    { key: 'review_period', label: 'Period' },
    { key: 'review_year', label: 'Year' },
    {
      key: 'overall_rating', label: 'Rating',
      render: v => <Chip label={v?.replace(/_/g, ' ')} size="small" color={RATING_COLORS[v] || 'default'} />,
    },
    { key: 'score', label: 'Score' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Performance Reviews</Typography>
        {hasRole('manager') && (
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            New Review
          </Button>
        )}
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          placeholder="Search…"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select size="small" label="Rating" value={filterRating}
          onChange={e => setFilterRating(e.target.value)} sx={{ width: 200 }}
        >
          <MenuItem value="">All ratings</MenuItem>
          {RATINGS.map(r => <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>
      ) : (
        <DataTable
          columns={columns}
          rows={reviews}
          onEdit={hasRole('manager') ? openEdit : undefined}
          onDelete={hasRole('admin') ? row => setDeleteTarget(row) : undefined}
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Review' : 'New Performance Review'}</DialogTitle>
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
                select label="Period" fullWidth size="small"
                value={form.review_period}
                onChange={e => setForm(p => ({ ...p, review_period: e.target.value }))}
                error={Boolean(formErrors.review_period)} helperText={formErrors.review_period}
              >
                {PERIODS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Year" fullWidth size="small" type="number"
                value={form.review_year}
                onChange={e => setForm(p => ({ ...p, review_year: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select label="Overall Rating" fullWidth size="small"
                value={form.overall_rating}
                onChange={e => setForm(p => ({ ...p, overall_rating: e.target.value }))}
                error={Boolean(formErrors.overall_rating)} helperText={formErrors.overall_rating}
              >
                {RATINGS.map(r => <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Score (0-100)" fullWidth size="small" type="number"
                value={form.score}
                onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select label="Status" fullWidth size="small"
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              >
                {['draft', 'submitted', 'approved'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            {['strengths', 'areas_to_improve', 'goals_next_period'].map(field => (
              <Grid item xs={12} key={field}>
                <TextField
                  label={field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  fullWidth size="small" multiline rows={2}
                  value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                />
              </Grid>
            ))}
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
        title="Delete Review"
        message="Delete this performance review? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </Box>
  )
}
