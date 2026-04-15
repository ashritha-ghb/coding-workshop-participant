import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  CircularProgress, Button, Divider,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import api from '../services/api'

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [reviews, setReviews] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/employees/${id}`),
      api.get('/performance-reviews', { params: { employee_id: id } }).catch(() => ({ data: { reviews: [] } })),
      api.get('/development-plans', { params: { employee_id: id } }).catch(() => ({ data: { plans: [] } })),
    ]).then(([emp, rev, plans]) => {
      setEmployee(emp.data)
      setReviews(rev.data.reviews || [])
      setPlans(plans.data.plans || [])
    }).catch(() => navigate('/employees'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
  if (!employee) return null

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/employees')} sx={{ mb: 2 }}>
        Back to Employees
      </Button>

      <Typography variant="h5" gutterBottom>{employee.full_name}</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>{employee.email}</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Profile</Typography>
              <Divider sx={{ mb: 2 }} />
              {[
                ['Code', employee.employee_code],
                ['Department', employee.department],
                ['Title', employee.job_title],
                ['Hire Date', employee.hire_date?.split('T')[0]],
                ['Status', employee.employment_status],
              ].map(([label, value]) => (
                <Box key={label} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value || '—'}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Reviews ({reviews.length})</Typography>
              <Divider sx={{ mb: 2 }} />
              {reviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No reviews yet</Typography>
              ) : reviews.slice(0, 3).map(r => (
                <Box key={r.id} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={500}>
                      {r.review_period} {r.review_year}
                    </Typography>
                    <Chip label={r.overall_rating?.replace(/_/g, ' ')} size="small" />
                  </Box>
                  {r.strengths && (
                    <Typography variant="caption" color="text.secondary">
                      {r.strengths.slice(0, 100)}
                    </Typography>
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Development Plans ({plans.length})</Typography>
              <Divider sx={{ mb: 2 }} />
              {plans.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No plans yet</Typography>
              ) : plans.slice(0, 3).map(p => (
                <Box key={p.id} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={500}>{p.title}</Typography>
                    <Chip label={p.status?.replace(/_/g, ' ')} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Progress: {p.progress_pct}%
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
