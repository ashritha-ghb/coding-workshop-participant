import React, { useEffect, useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  List, ListItem, ListItemText, Chip, Divider,
} from '@mui/material'
import {
  People, Assessment, TrendingUp, School, Psychology,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const RATING_COLORS = {
  exceeds_expectations: 'success',
  meets_expectations: 'primary',
  needs_improvement: 'warning',
  unsatisfactory: 'error',
}

function StatCard({ icon, label, value, color = 'primary.main' }) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ color, fontSize: 40 }}>{icon}</Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>{value ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { hasRole } = useAuth()
  const [stats, setStats] = useState({})
  const [recentReviews, setRecentReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetches = [
      api.get('/performance-reviews').catch(() => ({ data: { total: 0 } })),
      api.get('/development-plans').catch(() => ({ data: { total: 0 } })),
      api.get('/competencies').catch(() => ({ data: { total: 0 } })),
      api.get('/training-records').catch(() => ({ data: { total: 0 } })),
    ]

    if (hasRole('manager')) {
      fetches.push(api.get('/employees').catch(() => ({ data: { total: 0 } })))
    }

    Promise.all(fetches).then(([reviews, plans, comps, training, employees]) => {
      setStats({
        reviews: reviews.data.total,
        plans: plans.data.total,
        competencies: comps.data.total,
        training: training.data.total,
        employees: employees?.data.total,
      })
      setRecentReviews((reviews.data.reviews || []).slice(0, 5))
    }).finally(() => setLoading(false))
  }, [hasRole])

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Overview of employee performance and development activity
      </Typography>

      <Grid container spacing={3} mb={4}>
        {hasRole('manager') && (
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<People />} label="Total Employees" value={stats.employees} color="primary.main" />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard icon={<Assessment />} label="Performance Reviews" value={stats.reviews} color="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard icon={<TrendingUp />} label="Development Plans" value={stats.plans} color="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard icon={<Psychology />} label="Competency Records" value={stats.competencies} color="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard icon={<School />} label="Training Records" value={stats.training} color="info.main" />
        </Grid>
      </Grid>

      {recentReviews.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Performance Reviews</Typography>
            <List dense disablePadding>
              {recentReviews.map((r, i) => (
                <React.Fragment key={r.id}>
                  {i > 0 && <Divider />}
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <ListItemText
                      primary={`Employee #${r.employee_id} — ${r.review_period} ${r.review_year}`}
                      secondary={r.strengths?.slice(0, 80) || 'No notes'}
                    />
                    <Chip
                      label={r.overall_rating?.replace(/_/g, ' ')}
                      size="small"
                      color={RATING_COLORS[r.overall_rating] || 'default'}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
