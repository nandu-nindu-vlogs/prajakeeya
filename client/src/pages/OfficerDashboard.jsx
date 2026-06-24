import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Stack,
  LinearProgress, Alert, CircularProgress, Avatar, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, alpha
} from '@mui/material';
import { CheckCircle, Cancel, TrendingUp, RateReview, Warning, FolderOpen, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getOfficerDashboard, getFiles, actionFile } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const STATUS_COLORS = {
  submitted: { color: '#0891B2', bg: '#E0F2FE' },
  under_review: { color: '#D97706', bg: '#FEF3C7' },
  approved: { color: '#059669', bg: '#D1FAE5' },
  rejected: { color: '#DC2626', bg: '#FEE2E2' },
  escalated: { color: '#7C3AED', bg: '#EDE9FE' },
};

export default function OfficerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = () => {
    Promise.all([getOfficerDashboard(), getFiles()])
      .then(([d, f]) => { setDashboard(d.data); setFiles(f.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAction = async (fileId, action, note = '') => {
    setActioning(fileId);
    try {
      await actionFile(fileId, { action, note });
      setMsg({ type: 'success', text: `File #${fileId} ${action}d successfully` });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Action failed' });
    } finally { setActioning(null); }
  };

  const pending = files.filter(f => ['submitted','under_review','escalated'].includes(f.status));
  const slaBreached = pending.filter(f => {
    const hrs = (Date.now() - new Date(f.created_at).getTime()) / 3600000;
    return hrs > (f.sla_hours || 48);
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Officer Workstation</Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.name} · {user?.dept_name || 'All Departments'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {msg && <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {slaBreached.length > 0 && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          <strong>{slaBreached.length} file(s) have breached SLA</strong> — Immediate action required to avoid auto-escalation.
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Pending Action', labelKn: 'ಬಾಕಿ', value: pending.length, color: '#D97706', icon: <FolderOpen /> },
          { label: 'SLA Breaches', labelKn: 'SLA ಉಲ್ಲಂಘನೆ', value: slaBreached.length, color: '#DC2626', icon: <Warning /> },
          { label: 'Approved Today', labelKn: 'ಇಂದು ಅನುಮೋದಿಸಿದ', value: dashboard?.today_approved || 0, color: '#10B981', icon: <CheckCircle /> },
          { label: 'Total Processed', labelKn: 'ಒಟ್ಟು ಸಂಸ್ಕರಿಸಿದ', value: files.filter(f => ['approved','rejected'].includes(f.status)).length, color: NAVY, icon: <TrendingUp /> },
        ].map(k => (
          <Grid item xs={6} sm={3} key={k.label}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Avatar sx={{ bgcolor: alpha(k.color, 0.1), color: k.color, width: 40, height: 40 }}>{k.icon}</Avatar>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: k.color }}>{k.value}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.label}</Typography>
                <Typography variant="caption" color="text.secondary">{k.labelKn}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pending queue - actionable */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Pending File Queue ({pending.length})
            <Typography component="span" variant="caption" sx={{ color: '#64748B', ml: 1 }}>Click file to view details · Act directly from here</Typography>
          </Typography>
          {pending.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#10B981' }}>Queue Clear!</Typography>
              <Typography variant="body2" color="text.secondary">All files have been actioned</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File</TableCell>
                    <TableCell>Citizen</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>SLA</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pending.map(f => {
                    const hoursElapsed = (Date.now() - new Date(f.created_at).getTime()) / 3600000;
                    const slaOk = hoursElapsed <= (f.sla_hours || 48);
                    const hoursLeft = Math.max(0, (f.sla_hours || 48) - hoursElapsed);
                    const sc = STATUS_COLORS[f.status] || STATUS_COLORS.submitted;
                    return (
                      <TableRow key={f.id} sx={!slaOk ? { bgcolor: '#FFF5F5' } : {}}>
                        <TableCell>
                          <Box sx={{ cursor: 'pointer' }} onClick={() => navigate(`/files/${f.id}`)}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0891B2' }}>{f.title}</Typography>
                            <Typography variant="caption" color="text.secondary">#{f.id} · {f.priority}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="caption">{f.citizen_name || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{f.category}</Typography></TableCell>
                        <TableCell>
                          <Chip label={f.status.replace('_',' ')} size="small"
                            sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          {slaOk ? (
                            <Typography variant="caption" sx={{ color: hoursLeft < 12 ? '#D97706' : '#10B981', fontWeight: 600 }}>
                              {Math.round(hoursLeft)}h left
                            </Typography>
                          ) : (
                            <Chip label="BREACHED" size="small" color="error" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" variant="contained" color="success"
                              onClick={() => handleAction(f.id, 'approve', 'Approved after review')}
                              disabled={actioning === f.id}
                              sx={{ fontSize: 11, py: 0.5, minWidth: 'auto', px: 1.5 }}>
                              {actioning === f.id ? <CircularProgress size={14} /> : '✓ Approve'}
                            </Button>
                            <Button size="small" variant="outlined" color="error"
                              onClick={() => handleAction(f.id, 'reject', 'Rejected — incomplete documents')}
                              disabled={actioning === f.id}
                              sx={{ fontSize: 11, py: 0.5, minWidth: 'auto', px: 1.5 }}>
                              ✗ Reject
                            </Button>
                            <Button size="small" variant="outlined"
                              onClick={() => navigate(`/files/${f.id}`)}
                              sx={{ fontSize: 11, py: 0.5, minWidth: 'auto', px: 1.5 }}>
                              View
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
