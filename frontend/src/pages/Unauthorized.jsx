import React from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import { LockOutlined, ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ p: 5, borderRadius: 3, textAlign: 'center', maxWidth: 420 }}
      >
        <Box
          sx={{
            width: 72, height: 72, borderRadius: '50%',
            bgcolor: 'error.50', display: 'flex',
            alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3,
          }}
        >
          <LockOutlined sx={{ fontSize: 36, color: 'error.main' }} />
        </Box>

        <Typography variant="h5" fontWeight={700} mb={1}>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          You don't have permission to view this page.
        </Typography>
        {user && (
          <Typography variant="caption" color="text.disabled" display="block" mb={3}>
            Signed in as <strong>{user.email}</strong> · Role: <strong>{user.role}</strong>
          </Typography>
        )}

        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
          >
            Go to Dashboard
          </Button>
          {!user && (
            <Button variant="outlined" onClick={() => navigate('/')}>
              Sign In
            </Button>
          )}
          {user && (
            <Button variant="outlined" color="error" onClick={logout}>
              Sign out
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
