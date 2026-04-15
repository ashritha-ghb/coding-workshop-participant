import React, { useEffect, useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  List, ListItem, ListItemText, Chip, Divider, LinearProgress,
  Avatar, Stack, Paper,
} from '@mui/material'
import {
  People, Assessment, TrendingUp, School, Psychology,
  EmojiEvents, Warning, CheckCircle,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const RATING_COLORS = {
  exceeds_expectations: 'success',
  meets_expectations: 'primary',
  needs_improvement: 'warning',
  unsatisfactory: 'error',
}

const RATING_LABELS = {
  exceeds_expectations: 'Exceeds',
  meets_expectations: 'Meets',
  needs_improvement: 'Needs Work',
  unsatisfactory: 'Unsatisfactory',
}

function StatCard({ icon, label, value, color, trend }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" mb={0.5}>{label}</Typography>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              {value ?? '—'}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, width: 48, height: 48 }}>
            <Box sx={{ color: `${color}.main`, display: 'flex' }}>{icon}</Box>
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const [stats, setStats] = useState({})
  const [recentReviews, setRecentReviews] = useState([])
  const [gapCompetencies, setGapCompetencies] = useState([])
  const [recentTraining, setRecentTraining] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetches = [
      api.get('/performance-reviews').catch(() => ({ data: { reviews: [], total: 0 } })),
      api.get('/development-plans').catch(() => ({ data: { total: 0 } })),
      api.get('/competencies', { params: { has_gap: 'true' } }).catch(() => ({ data: { competencies: [], total: 0 } })),
      api.get('/training-records').catch(() => ({ data: { records: [], total: 0 } })),
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
      setRecentReviews((reviews.data.reviews || []).slice(0, 4))
      setGapCompetencies((comps.data.competencies || []).slice(0, 4))
      setRecentTraining((training.data.records || []).filter(r => r.status === 'completed').slice(0, 4))
    }).finally(() => setLoading(false))
  }, [hasRole])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          {greeting()}, {user?.full_name?.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Here's what's happening across your organization today.
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} mb={4}>
        {hasRole('manager') && (
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon={<People />} label="Total Employees" value={stats.employees} color="primary" />
          </Grid>
        )}
        <Grid item xs={12} sm={6} lg={hasRole('manager') ? 3 : 4}>
          <StatCard icon={<Assessment />} label="Performance Reviews" value={stats.reviews} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} lg={hasRole('manager') ? 3 : 4}>
          <StatCard icon={<TrendingUp />} label="Development Plans" value={stats.plans} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} lg={hasRole('manager') ? 3 : 4}>
          <StatCard icon={<School />} label="Training Records" value={stats.training} color="info" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Reviews */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Assessment color="secondary" fontSize="small" />
                <Typography variant="h6">Recent Reviews</Typography>
              </Box>
              {recentReviews.length === 0 ? (
                <Box py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">No reviews yet</Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {recentReviews.map((r, i) => (
                    <React.Fragment key={r.id}>
                      {i > 0 && <Divider />}
                      <ListItem disablePadding sx={{ py: 1.5 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={500}>
                              Employee #{r.employee_id} — {r.review_period} {r.review_year}
                            </Typography>
                          }
                          secondary={r.strengths?.slice(0, 60) || 'No notes added'}
                        />
                        <Chip
                          label={RATING_LABELS[r.overall_rating] || r.overall_rating}
                          size="small"
                          color={RATING_COLORS[r.overall_rating] || 'default'}
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Skill Gaps */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Warning color="warning" fontSize="small" />
                <Typography variant="h6">Skill Gaps</Typography>
                {gapCompetencies.length > 0 && (
                  <Chip label={`${stats.competencies} gaps`} size="small" color="warning" sx={{ ml: 'auto' }} />
                )}
              </Box>
              {gapCompetencies.length === 0 ? (
                <Box py={3} textAlign="center">
                  <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No skill gaps identified</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {gapCompetencies.map(c => (
                    <Box key={c.id}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" fontWeight={500}>{c.skill_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.current_level}/5 → {c.target_level}/5
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(c.current_level / 5) * 100}
                        color="warning"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Completed Training */}
        {recentTraining.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EmojiEvents color="success" fontSize="small" />
                  <Typography variant="h6">Recently Completed Training</Typography>
                </Box>
                <Grid container spacing={2}>
                  {recentTraining.map(t => (
                    <Grid item xs={12} sm={6} md={3} key={t.id}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{t.training_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.provider || 'Self-paced'}</Typography>
                        {t.score && (
                          <Box mt={1}>
                            <Chip label={`Score: ${t.score}`} size="small" color="success" />
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
