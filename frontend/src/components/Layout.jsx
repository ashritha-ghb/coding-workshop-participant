import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  Avatar, Menu, MenuItem, Divider, Chip, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assessment as ReviewIcon,
  TrendingUp as PlanIcon,
  Psychology as CompIcon,
  School as TrainingIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  AccountCircle,
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 240

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Employees', path: '/employees', icon: <PeopleIcon />, minRole: 'manager' },
  { label: 'Performance Reviews', path: '/reviews', icon: <ReviewIcon /> },
  { label: 'Development Plans', path: '/plans', icon: <PlanIcon /> },
  { label: 'Competencies', path: '/competencies', icon: <CompIcon /> },
  { label: 'Training Records', path: '/training', icon: <TrainingIcon /> },
]

const ROLE_COLORS = {
  admin: 'error',
  manager: 'warning',
  contributor: 'primary',
  viewer: 'default',
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)

  const visibleNav = navItems.filter(item => !item.minRole || hasRole(item.minRole))

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" color="primary" fontWeight={700}>
          ACME HR
        </Typography>
      </Toolbar>
      <Divider />
      <List dense>
        {visibleNav.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => { navigate(item.path); setDrawerOpen(false) }}
              sx={{ borderRadius: 1, mx: 1, my: 0.25 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }} elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Employee Performance Platform
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            color={ROLE_COLORS[user?.role] || 'default'}
            sx={{ mr: 2, textTransform: 'capitalize' }}
          />
          <IconButton color="inherit" onClick={e => setAnchorEl(e.currentTarget)}>
            <AccountCircle />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Typography variant="body2">{user?.full_name}</Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); logout() }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
