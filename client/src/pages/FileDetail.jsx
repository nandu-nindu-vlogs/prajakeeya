import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Alert,
  TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Avatar, Divider, Grid, alpha, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  ArrowBack, CheckCircle, Cancel, TrendingUp, RateReview, Warning,
  Person, Schedule, Security, Send
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { getFile, actionFile } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const STATUS_CONFIG = {
  submitted: { color: '#0891B2', bg: '#E0F2FE', label: 'Submitted' },
  under_review: { color: '#D97706', bg: '#FEF3C7', label: 'Under Review' },
  approved: { color: '#059669', bg: '#D1FAE5', label: 'Approved' },
  rejected: { color: '#DC2626', bg: '#FEE2E2', label: 'Rejected' },
  escalated: { color: '#7C3AED', bg: '#EDE9FE', label: 'Escalated' },
  closed: { color: '#64748B', bg: '#F1F5F9', label: 'Closed' },
};

const ACTION_COLORS = {
  submit: '#0891B2', approve: '#059669', reject: '#DC2626',
  escalate: '#7C3AED', review: '#D97706', login: '#94A3B8',
};

export default function FileDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    getFile(id).then(r => setFile(r.data)).catch(() => navigate('/files')).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleAction = async () => {
    if (!actionDialog) return;
    setActioning(true);
    try {
      await actionFile(id, { action: actionDialog, note });
      setMsg({ type: 'success', text: `File ${actionDialog}d successfully` });
      setActionDialog(null);
      setNote('');
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Action failed' });
    } finally { setActioning(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!file) return null;

  const sc = STATUS_CONFIG[file.status] || STATUS_CONFIG.submitted;
  const hoursElapsed = (Date.now() - new Date(file.created_at).getTime()) / 3600000;
  const slaBreached = hoursElapsed > (file.sla_hours || 48) && !['approved','rejected','closed'].includes(file.status);
  const hoursLeft = Math.max(0, (file.sla_hours || 48) - hoursElapsed);
  const slaPercent = Math.min(100, (hoursElapsed / (file.sla_hours || 48)) * 100);

  const canAct = ['officer','admin'].includes(user?.role) && !['approved','rejected','closed'].includes(file.status);

  const ACTIONS = [
    { key: 'review', label: 'Mark Under Review', color: '#D97706', icon: <RateReview /> },
    { key: 'approve', label: 'Approve', color: '#10B981', icon: <CheckCircle /> },
    { key: 'reject', label: 'Reject', color: '#EF4444', icon: <Cancel /> },
    { key: 'escalate', label: 'Escalate', color: '#8B5CF6', icon: <TrendingUp /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/files')} sx={{ mb: 3, color: '#64748B' }}>
        Back to Files
      </Button>

      {msg && <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {slaBreached && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          SLA BREACHED — File has been open {Math.round(hoursElapsed)} hours (limit: {file.sla_hours}h). Immediate action required.
        </Alert>
      )}

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>FILE #{file.id}</Typography>
                <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                <Chip label={file.priority} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>{file.title}</Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>{file.category} · {file.dept_name}</Typography>
            </Box>
            {canAct && (
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {ACTIONS.map(a => (
                  <Button key={a.key} size="small" variant="outlined"
                    startIcon={a.icon}
                    onClick={() => setActionDialog(a.key)}
                    sx={{ borderColor: a.color, color: a.color, '&:hover': { bgcolor: alpha(a.color, 0.08) } }}>
                    {a.label}
                  </Button>
                ))}
              </Stack>
            )}
          </Box>

          {/* SLA progress */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#374151' }}>SLA Progress</Typography>
              <Typography variant="caption" sx={{ color: slaBreached ? '#DC2626' : hoursLeft < 12 ? '#D97706' : '#10B981', fontWeight: 600 }}>
                {slaBreached ? `${Math.round(hoursElapsed)}h elapsed — BREACHED` : `${Math.round(hoursLeft)}h remaining of ${file.sla_hours}h`}
              </Typography>
            </Box>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
              <Box sx={{
                height: '100%', borderRadius: 4,
                width: `${slaPercent}%`,
                bgcolor: slaBreached ? '#DC2626' : slaPercent > 75 ? '#D97706' : '#10B981',
                transition: 'width 0.5s ease',
              }} />
            </Box>
          </Box>

          {/* File details grid */}
          <Grid container spacing={2}>
            {[
              { label: 'Submitted by', value: file.citizen_name || '—' },
              { label: 'Department', value: file.dept_name || '—' },
              { label: 'Submitted on', value: new Date(file.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
              { label: 'Last updated', value: new Date(file.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
              { label: 'Assigned officer', value: file.officer_name || 'Not assigned' },
              { label: 'SLA hours', value: `${file.sla_hours}h` },
            ].map(d => (
              <Grid item xs={6} sm={4} key={d.label}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{d.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.value}</Typography>
              </Grid>
            ))}
          </Grid>

          {file.description && (
            <Box sx={{ mt: 2.5, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Description</Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{file.description}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Audit Timeline */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Security sx={{ color: NAVY, fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Immutable Audit Trail</Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>· SHA-256 hash-chained · Tamper-proof</Typography>
          </Box>
          {!file.actions || file.actions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No actions recorded yet.</Typography>
          ) : (
            <Box>
              {file.actions.map((action, i) => {
                const isLast = i === file.actions.length - 1;
                const color = ACTION_COLORS[action.action] || '#64748B';
                return (
                  <Box key={action.id} sx={{ display: 'flex', gap: 2, mb: isLast ? 0 : 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 36, height: 36 }}>
                        <Person fontSize="small" />
                      </Avatar>
                      {!isLast && <Box sx={{ flex: 1, width: 2, bgcolor: '#F1F5F9', mt: 1, minHeight: 24 }} />}
                    </Box>
                    <Box sx={{ flex: 1, pb: isLast ? 0 : 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{action.actor_name}</Typography>
                          <Chip label={action.action.toUpperCase()} size="small"
                            sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, height: 20, fontSize: 10 }} />
                          {action.to_status && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">→</Typography>
                              <Chip label={action.to_status.replace('_',' ')} size="small"
                                sx={{ bgcolor: (STATUS_CONFIG[action.to_status] || {}).bg || '#F1F5F9', color: (STATUS_CONFIG[action.to_status] || {}).color || '#64748B', height: 20, fontSize: 10, fontWeight: 700 }} />
                            </Box>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(action.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                      </Box>
                      {action.note && (
                        <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 2, p: 1.5 }}>
                          <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6 }}>{action.note}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onClose={() => setActionDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: 'capitalize' }}>{actionDialog} File #{id}</DialogTitle>
        <DialogContent>
          <TextField
            label="Note / Reason"
            multiline rows={4} fullWidth value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={actionDialog === 'reject' ? 'Provide reason for rejection...' : 'Add a note (optional)...'}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setActionDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAction} disabled={actioning}
            startIcon={actioning ? <CircularProgress size={16} /> : <Send />}
            sx={{ background: ACTION_COLORS[actionDialog] ? ACTION_COLORS[actionDialog] : `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
            {actioning ? 'Processing...' : `Confirm ${actionDialog}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
