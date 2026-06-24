import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, Chip, Divider, IconButton, Tooltip, alpha
} from '@mui/material';
import {
  Dashboard, Folder, People, AccountBalance, Gavel, Assessment,
  Book, Public, Warning, ChevronLeft, Menu, Article, SupportAgent,
  Construction, Business, Shield, Person, Logout, TrendingUp
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const NAVY   = '#0D1B2A';
const GOLD   = '#F59E0B';
const DRAWER = 220;

// Navigation items by role
const NAV = {
  citizen: [
    { label: 'Dashboard',          path: '/dashboard',     icon: <Dashboard fontSize="small" /> },
    { label: 'My Applications',    path: '/files',         icon: <Folder fontSize="small" /> },
    { label: 'Documents',          path: '/documents',     icon: <Article fontSize="small" /> },
    { label: 'Dev Projects',       path: '/projects',      icon: <Construction fontSize="small" /> },
    { label: 'Grievances',         path: '/grievances',    icon: <SupportAgent fontSize="small" /> },
    { label: 'Transparency',       path: '/public',        icon: <Public fontSize="small" /> },
  ],
  officer: [
    { label: 'Dashboard',          path: '/dashboard',     icon: <Dashboard fontSize="small" /> },
    { label: 'All Files',          path: '/files',         icon: <Folder fontSize="small" /> },
    { label: 'Beneficiaries',      path: '/beneficiaries', icon: <People fontSize="small" /> },
    { label: 'Finance & Budget',   path: '/finance',       icon: <AccountBalance fontSize="small" /> },
    { label: 'Documents',          path: '/documents',     icon: <Article fontSize="small" /> },
    { label: 'Projects',           path: '/projects',      icon: <Construction fontSize="small" /> },
    { label: 'Grievances',         path: '/grievances',    icon: <SupportAgent fontSize="small" /> },
  ],
  admin: [
    { label: 'Dashboard',          path: '/dashboard',     icon: <Dashboard fontSize="small" /> },
    { label: 'All Files',          path: '/files',         icon: <Folder fontSize="small" /> },
    { label: 'Beneficiaries',      path: '/beneficiaries', icon: <People fontSize="small" /> },
    { label: 'Finance & Budget',   path: '/finance',       icon: <AccountBalance fontSize="small" /> },
    { label: 'Tenders',            path: '/procurement',   icon: <Gavel fontSize="small" /> },
    { label: 'Projects',           path: '/projects',      icon: <Construction fontSize="small" /> },
    { label: 'Grievances',         path: '/grievances',    icon: <SupportAgent fontSize="small" /> },
    { label: 'Documents',          path: '/documents',     icon: <Article fontSize="small" /> },
    { label: 'Analytics',          path: '/analytics',     icon: <Assessment fontSize="small" /> },
    { label: 'Audit Ledger',       path: '/ledger',        icon: <Book fontSize="small" /> },
    { label: 'Transparency',       path: '/public',        icon: <Public fontSize="small" /> },
    { label: 'Fraud Analysis',     path: '/fraud',         icon: <Warning fontSize="small" /> },
  ],
  auditor: [
    { label: 'Dashboard',          path: '/dashboard',     icon: <Dashboard fontSize="small" /> },
    { label: 'Analytics',          path: '/analytics',     icon: <Assessment fontSize="small" /> },
    { label: 'All Files',          path: '/files',         icon: <Folder fontSize="small" /> },
    { label: 'Audit Ledger',       path: '/ledger',        icon: <Book fontSize="small" /> },
    { label: 'Projects',           path: '/projects',      icon: <Construction fontSize="small" /> },
    { label: 'Transparency',       path: '/public',        icon: <Public fontSize="small" /> },
    { label: 'Fraud Analysis',     path: '/fraud',         icon: <Warning fontSize="small" /> },
  ],
  contractor: [
    { label: 'Contractor Portal',  path: '/contractor',    icon: <Business fontSize="small" /> },
    { label: 'Open Tenders',       path: '/procurement',   icon: <Gavel fontSize="small" /> },
    { label: 'Projects',           path: '/projects',      icon: <Construction fontSize="small" /> },
    { label: 'Transparency',       path: '/public',        icon: <Public fontSize="small" /> },
  ],
};

const ROLE_COLORS = {
  citizen:    '#0891B2',
  officer:    '#8B5CF6',
  admin:      '#EF4444',
  auditor:    GOLD,
  contractor: '#10B981',
};

const ROLE_LABELS = {
  citizen:    'Citizen / ನಾಗರಿಕ',
  officer:    'Officer / ಅಧಿಕಾರಿ',
  admin:      'Administrator',
  auditor:    'Auditor / ಲೆಕ್ಕ ಪರಿಶೀಲಕ',
  contractor: 'Contractor / ಗುತ್ತಿಗೆದಾರ',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(true);

  const navItems = NAV[user?.role] || NAV.citizen;
  const roleColor = ROLE_COLORS[user?.role] || NAVY;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: NAVY }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: GOLD, color: NAVY, width: 36, height: 36, fontWeight: 800, fontSize: 14 }}>ಪ್ರ</Avatar>
          {open && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Prajakeeya</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', lineHeight: 1 }}>Zero-Corruption Governance</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

      {/* User badge */}
      {open && user && (
        <Box sx={{ p: 2, mx: 1.5, mt: 1.5, bgcolor: alpha('#fff', 0.05), borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: roleColor, fontSize: 13, fontWeight: 700 }}>
              {user.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', display: 'block' }} noWrap>{user.name}</Typography>
            </Box>
          </Box>
          <Chip
            label={ROLE_LABELS[user.role] || user.role}
            size="small"
            sx={{ bgcolor: alpha(roleColor, 0.2), color: roleColor, border: `1px solid ${alpha(roleColor, 0.4)}`, fontSize: 10, fontWeight: 700, height: 20 }}
          />
        </Box>
      )}

      {/* Nav */}
      <List sx={{ flex: 1, px: 1, mt: 1 }}>
        {navItems.map(item => {
          const active = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1.5,
                  px: open ? 2 : 1.5,
                  py: 1,
                  bgcolor: active ? alpha(GOLD, 0.15) : 'transparent',
                  '&:hover': { bgcolor: active ? alpha(GOLD, 0.2) : alpha('#fff', 0.07) },
                }}
              >
                <ListItemIcon sx={{ minWidth: open ? 36 : 'auto', color: active ? GOLD : '#94A3B8' }}>
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 700 : 500, color: active ? GOLD : '#CBD5E1', fontSize: 13 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: alpha('#fff', 0.1) }} />

      {/* Footer */}
      <Box sx={{ p: 1.5 }}>
        <ListItemButton onClick={() => { logout(); navigate('/login'); }}
          sx={{ borderRadius: 1.5, px: 2, py: 1, '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}>
          <ListItemIcon sx={{ minWidth: open ? 36 : 'auto', color: '#64748B' }}><Logout fontSize="small" /></ListItemIcon>
          {open && <ListItemText primary="Sign Out" primaryTypographyProps={{ variant: 'body2', color: '#64748B', fontSize: 13 }} />}
        </ListItemButton>
        {open && (
          <Typography variant="caption" sx={{ color: '#334155', display: 'block', textAlign: 'center', mt: 1 }}>
            v2.0 · ಪ್ರಜಾಕೀಯ ವ್ಯವಸ್ಥೆ
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#F8FAFC' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: open ? DRAWER : 64,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: open ? DRAWER : 64, border: 'none', overflowX: 'hidden', transition: 'width 0.2s' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: '#fff', borderBottom: '1px solid #E2E8F0',
          px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronLeft fontSize="small" /> : <Menu fontSize="small" />}
          </IconButton>
          <Typography variant="caption" sx={{ color: '#94A3B8', ml: 1 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield sx={{ fontSize: 14, color: '#10B981' }} />
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>Immutable Ledger Active</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
