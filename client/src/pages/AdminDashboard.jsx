import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Stack, Avatar,
  Alert, CircularProgress, List, ListItem, ListItemText, ListItemAvatar,
  Divider, LinearProgress, alpha
} from '@mui/material';
import {
  Warning, CheckCircle, TrendingUp, Group, BarChart, Security,
  FolderOpen, Campaign, Gavel, AccountBalance, ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAdminDashboard, getAnalyticsOverview, resolveAlert } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const SEV_COLORS = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#2563EB' };

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([getAdminDashboard(), getAnalyticsOverview()])
      .then(([d, a]) => { setDashboard(d.data); setAnalytics(a.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleResolve = async (id) => {
    try { await resolveAlert(id); load(); } catch {}
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const k = analytics?.kpis || {};
  const alerts = dashboard?.alerts || [];
  const unresolved = alerts.filter(a => !a.resolved);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>
          {user?.role === 'auditor' ? 'Audit Dashboard' : 'Admin Command Center'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          System health, anomalies, and governance performance · ಆಡಳಿತ ನಿಯಂತ್ರಣ ಕೇಂದ್ರ
        </Typography>
      </Box>

      {unresolved.filter(a => a.severity === 'critical').length > 0 && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          <strong>{unresolved.filter(a => a.severity === 'critical').length} CRITICAL alert(s)</strong> require immediate attention!
        </Alert>
      )}

      {/* KPI cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Files', value: k.totalFiles, color: '#0891B2', icon: <FolderOpen />, path: '/files' },
          { label: 'Approval Rate', value: `${k.approvalRate}%`, color: '#10B981', icon: <CheckCircle /> },
          { label: 'Pending', value: k.pendingFiles, color: '#D97706', icon: <TrendingUp />, path: '/files' },
          { label: 'Active Alerts', value: unresolved.length, color: unresolved.length > 0 ? '#DC2626' : '#10B981', icon: <Warning /> },
          { label: 'Total Citizens', value: k.totalCitizens, color: NAVY, icon: <Group /> },
          { label: 'Frauds Blocked', value: k.duplicatesBlocked, color: '#EF4444', icon: <Security /> },
          { label: 'Open Grievances', value: k.openGrievances, color: '#8B5CF6', icon: <Campaign />, path: '/grievances' },
          { label: 'Docs Issued', value: k.docsIssued, color: '#10B981', icon: <CheckCircle /> },
        ].map(item => (
          <Grid item xs={6} sm={3} key={item.label}>
            <Card
              sx={{ cursor: item.path ? 'pointer' : 'default', '&:hover': item.path ? { boxShadow: 4 } : {} }}
              onClick={() => item.path && navigate(item.path)}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Avatar sx={{ bgcolor: alpha(item.color, 0.1), color: item.color, width: 36, height: 36 }}>{item.icon}</Avatar>
                  {item.path && <ArrowForward sx={{ fontSize: 16, color: '#CBD5E1' }} />}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: item.color }}>{item.value ?? '—'}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>{item.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Dept performance chart */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Department Performance</Typography>
                <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/analytics')}>Full Analytics</Button>
              </Box>
              <ResponsiveContainer width="100%" height={220}>
                <ReBarChart data={analytics?.byDept}>
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4,4,0,0]} />
                  <Bar dataKey="pending" name="Pending" fill={GOLD} radius={[4,4,0,0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4,4,0,0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>System Alerts</Typography>
                <Chip label={`${unresolved.length} active`} size="small" color={unresolved.length > 0 ? 'error' : 'success'} />
              </Box>
              {unresolved.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircle sx={{ fontSize: 40, color: '#10B981', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No active alerts</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5} sx={{ maxHeight: 280, overflowY: 'auto' }}>
                  {unresolved.slice(0, 8).map(a => (
                    <Box key={a.id} sx={{ p: 1.5, bgcolor: alpha(SEV_COLORS[a.severity] || '#64748B', 0.06), borderRadius: 2, border: `1px solid ${alpha(SEV_COLORS[a.severity] || '#64748B', 0.2)}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, mr: 1 }}>
                          <Chip label={a.severity.toUpperCase()} size="small"
                            sx={{ bgcolor: SEV_COLORS[a.severity], color: 'white', fontSize: 9, height: 18, fontWeight: 800, mb: 0.5 }} />
                          <Typography variant="caption" sx={{ display: 'block', color: '#374151', lineHeight: 1.4 }}>{a.message}</Typography>
                        </Box>
                        {user?.role === 'admin' && (
                          <Button size="small" sx={{ fontSize: 10, py: 0, minWidth: 'auto', color: '#10B981' }} onClick={() => handleResolve(a.id)}>
                            Resolve
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Budget */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Budget Utilization</Typography>
                <Button size="small" onClick={() => navigate('/finance')}>Manage Finance</Button>
              </Box>
              <Grid container spacing={2}>
                {(dashboard?.budgets || []).map(b => {
                  const pct = Math.min(100, Math.round((b.spent / b.allocated) * 100));
                  const color = pct >= 95 ? '#DC2626' : pct >= 75 ? '#D97706' : '#10B981';
                  return (
                    <Grid item xs={12} sm={6} md={3} key={b.id}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{b.dept_name}</Typography>
                          <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{pct}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={pct}
                          sx={{ height: 8, borderRadius: 4, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">₹{(b.spent/1e5).toFixed(1)}L spent</Typography>
                          <Typography variant="caption" color="text.secondary">₹{(b.allocated/1e5).toFixed(1)}L total</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
