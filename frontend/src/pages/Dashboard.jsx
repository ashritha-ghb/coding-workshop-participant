import React, { useEffect, useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  Chip, Divider, LinearProgress, Avatar, Stack, Paper, Button,
} from '@mui/material'
import {
  People, Assessment, TrendingUp, School,
  EmojiEvents, Warning, CheckCircle, ArrowForward,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
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

const STAT_BG = {
  primary: 'linear-gradient(135deg, #2563eb, #3b82f6)',
  secondary: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
  success: 'linear-gradient(135deg, #059669, #10b981)',
  info: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
}

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } : {},
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: STAT_BG[color] || STAT_BG.primary,
          opacity: 0.08,
        }}
      />
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </Typography>
            <Typography variant="h3" fontWeight={700} color="text.primary" mt={0.5}>
              {value ?? '—'}
            </Typography>
          </Box>
          <Avatar sx={{ background: STAT_BG[color] || STAT_BG.primary, width: 52, height: 52 }}>
            {icon}
          </Avatar>
        </Box>
        {onClick && (
          <Box display="flex" alignItems="center" gap={0.5} mt={2}>
            <Typography variant="caption" color="primary" fontWeight={500}>View all</Typography>
            <ArrowForward sx={{ fontSize: 12, color: 'primary.main' }} />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()
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
      setRecentReviews((reviews.data.reviews || []).slice(0, 5))
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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 4, p: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #7c3aed 100%)',
          color: 'white', position: 'relative', overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', bottom: -30, right: 100, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'relative' }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            {greeting}, {firstName} 👋
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
          <Chip
            label={user?.role?.toUpperCase()}
            size="small"
            sx={{ mt: 1.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, fontSize: '0.7rem' }}
          />
        </Box>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} mb={4}>
        {hasRole('manager') && (
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard icon={<People />} label="Total Employees" value={stats.employees} color="primary" onClick={() => navigate('/employees')} />
          </Grid>
        )}
        <Grid item xs={12} sm={6} lg={hasRole('manager') ? 3 : 4}>
          <StatCard icon={<Assessment />} label="Performance Reviews" value={stats.reviews} color="secondary" onClick={() => navigate('/reviews')} />
        </Grid>
        <Grid item xs={12} sm={6} lg={hasRole('manager') ? 3 : 4}>
          <StatCard icon={<TrendingUp />} label="Development Plans" value={stats.plans} color="success" onClick={() => navigate('/plans')} />
        </Grid>
        <Grid item xs={12} sm={6} lg={hasRole('manager') ? 3 : 4}>
          <StatCard icon={<School />} label="Training Records" value={stats.training} color="info" onClick={() => navigate('/training')} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Reviews */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Assessment color="secondary" fontSize="small" />
                  <Typography variant="h6" fontWeight={600}>Recent Reviews</Typography>
                </Box>
                <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/reviews')} sx={{ fontSize: '0.75rem' }}>
                  View all
                </Button>
              </Box>
              {recentReviews.length === 0 ? (
                <Box py={4} textAlign="center">
                  <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No performance reviews yet</Typography>
                  {hasRole('manager') && (
                    <Button size="small" variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/reviews')}>
                      Add first review
                    </Button>
                  )}
                </Box>
              ) : (
                <Stack divider={<Divider />} spacing={0}>
                  {recentReviews.map(r => (
                    <Box key={r.id} sx={{ py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          Employee #{r.employee_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.review_period} {r.review_year} · {r.status}
                        </Typography>
                      </Box>
                      <Chip
                        label={RATING_LABELS[r.overall_rating] || r.overall_rating}
                        size="small"
                        color={RATING_COLORS[r.overall_rating] || 'default'}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Skill Gaps */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning color="warning" fontSize="small" />
                  <Typography variant="h6" fontWeight={600}>Skill Gaps</Typography>
                </Box>
                {gapCompetencies.length > 0 && (
                  <Chip label={`${stats.competencies} open`} size="small" color="warning" />
                )}
              </Box>
              {gapCompetencies.length === 0 ? (
                <Box py={4} textAlign="center">
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No skill gaps identified</Typography>
                </Box>
              ) : (
                <Stack spacing={2.5}>
                  {gapCompetencies.map(c => (
                    <Box key={c.id}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                        <Typography variant="body2" fontWeight={500}>{c.skill_name}</Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="caption" color="text.secondary">{c.current_level}</Typography>
                          <Typography variant="caption" color="text.disabled">→</Typography>
                          <Typography variant="caption" color="warning.main" fontWeight={600}>{c.target_level}</Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(c.current_level / 5) * 100}
                        color="warning"
                        sx={{ height: 6, borderRadius: 3, bgcolor: 'warning.light', opacity: 0.3,
                          '& .MuiLinearProgress-bar': { opacity: 1 } }}
                      />
                    </Box>
                  ))}
                  <Button size="small" variant="text" onClick={() => navigate('/competencies')} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                    View all competencies →
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Completed Training */}
        {recentTraining.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmojiEvents color="success" fontSize="small" />
                    <Typography variant="h6" fontWeight={600}>Recently Completed Training</Typography>
                  </Box>
                  <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/training')} sx={{ fontSize: '0.75rem' }}>
                    View all
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {recentTraining.map(t => (
                    <Grid item xs={12} sm={6} md={3} key={t.id}>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 2, borderColor: 'success.light', bgcolor: 'rgba(5,150,105,0.03)', height: '100%' }}
                      >
                        <Typography variant="body2" fontWeight={600} noWrap mb={0.5}>{t.training_name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          {t.provider || 'Self-paced'}
                        </Typography>
                        {t.score && (
                          <Chip label={`Score: ${t.score}%`} size="small" color="success" variant="outlined" />
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
