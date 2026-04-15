import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  Menu, MenuItem, Divider, Chip, useMediaQuery, useTheme,
  Avatar, Tooltip, Stack,
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
} from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 248

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Employees', path: '/employees', icon: <PeopleIcon fontSize="small" />, minRole: 'manager' },
  { label: 'Performance Reviews', path: '/reviews', icon: <ReviewIcon fontSize="small" /> },
  { label: 'Development Plans', path: '/plans', icon: <PlanIcon fontSize="small" /> },
  { label: 'Competencies', path: '/competencies', icon: <CompIcon fontSize="small" /> },
  { label: 'Training Records', path: '/training', icon: <TrainingIcon fontSize="small" /> },
]

const ROLE_COLORS = {
  admin: 'error',
  manager: 'warning',
  contributor: 'primary',
  viewer: 'default',
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(role) {
  const colors = { admin: '#dc2626', manager: '#d97706', contributor: '#2563eb', viewer: '#64748b' }
  return colors[role] || '#64748b'
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 1.5,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="white" fontWeight={700}>A</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>ACME HR</Typography>
            <Typography variant="caption" color="text.secondary" lineHeight={1}>Performance</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, px: 1.5, py: 2, overflowY: 'auto' }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, mb: 1, display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Menu
        </Typography>
        <List dense disablePadding>
          {visibleNav.map(item => {
            const active = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={active}
                  onClick={() => { navigate(item.path); setDrawerOpen(false) }}
                  sx={{ borderRadius: 2, px: 1.5, py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: active ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 600 : 400 }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1, color: 'text.primary' }}>
            {visibleNav.find(n => n.path === location.pathname)?.label || 'ACME HR Platform'}
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            color={ROLE_COLORS[user?.role] || 'default'}
            sx={{ mr: 1, textTransform: 'capitalize' }}
          />
          <Tooltip title={user?.full_name}>
            <IconButton onClick={e => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: getAvatarColor(user?.role), fontSize: '0.75rem' }}>
                {getInitials(user?.full_name)}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* User menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { minWidth: 200, mt: 1 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>{user?.full_name}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); logout() }} sx={{ color: 'error.main', gap: 1 }}>
          <LogoutIcon fontSize="small" />
          Sign out
        </MenuItem>
      </Menu>

      {/* Sidebar */}
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
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          mt: '56px',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
