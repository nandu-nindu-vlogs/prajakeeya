import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Alert,
  TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Stepper, Step, StepLabel, StepContent, Avatar, Divider, alpha
} from '@mui/material';
import {
  Campaign, CheckCircle, Warning, Schedule, ArrowBack,
  Send, TrendingUp, Person
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrievance, respondGrievance, escalateGrievance } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const STATUS_CONFIG = {
  open: { color: '#0891B2', label: 'Open', bg: '#E0F2FE' },
  in_progress: { color: '#D97706', label: 'In Progress', bg: '#FEF3C7' },
  resolved: { color: '#059669', label: 'Resolved', bg: '#D1FAE5' },
  escalated: { color: '#DC2626', label: 'Escalated', bg: '#FEE2E2' },
  closed: { color: '#64748B', label: 'Closed', bg: '#F1F5F9' },
};

const ACTION_ICONS = {
  FILED: <Campaign fontSize="small" />,
  RESPONDED: <Send fontSize="small" />,
  ASSIGNED: <Person fontSize="small" />,
  ESCALATED: <TrendingUp fontSize="small" />,
  RESOLVED: <CheckCircle fontSize="small" />,
};

const ACTION_COLORS = {
  FILED: '#0891B2', RESPONDED: '#D97706', ASSIGNED: '#8B5CF6',
  ESCALATED: '#DC2626', RESOLVED: '#059669',
};

export default function GrievanceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyForm, setReplyForm] = useState({ note: '', action: 'RESPONDED', status: '' });
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    getGrievance(id).then(r => setGrievance(r.data)).catch(() => navigate('/grievances')).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleRespond = async () => {
    if (!replyForm.note) return;
    setResponding(true);
    try {
      await respondGrievance(id, replyForm);
      setMsg({ type: 'success', text: 'Response submitted successfully' });
      setShowReply(false);
      setReplyForm({ note: '', action: 'RESPONDED', status: '' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to respond' });
    } finally { setResponding(false); }
  };

  const handleEscalate = async () => {
    try {
      await escalateGrievance(id);
      setMsg({ type: 'warning', text: 'Grievance escalated to senior officer' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to escalate' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!grievance) return null;

  const sc = STATUS_CONFIG[grievance.status] || STATUS_CONFIG.open;
  const canRespond = ['officer','admin'].includes(user?.role) && !['resolved','closed'].includes(grievance.status);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/grievances')} sx={{ mb: 3, color: '#64748B' }}>
        Back to Grievances
      </Button>

      {msg && <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* Header */}
      <Card sx={{ mb: 3, border: grievance.sla_breached ? '1px solid #FCA5A5' : '1px solid #E2E8F0' }}>
        <CardContent sx={{ p: 3 }}>
          {grievance.sla_breached && (
            <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
              SLA BREACHED — This grievance has been open for {grievance.hours_elapsed} hours (limit: {grievance.sla_hours}h). Immediate action required.
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#0891B2', fontWeight: 700, fontSize: 13 }}>
                  {grievance.ticket_id}
                </Typography>
                <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                <Chip label={grievance.priority} size="small" sx={{ textTransform: 'capitalize', bgcolor: grievance.priority === 'critical' ? '#EDE9FE' : '#F1F5F9', color: grievance.priority === 'critical' ? '#7C3AED' : '#64748B', fontWeight: 700 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>{grievance.subject}</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {canRespond && <Button variant="contained" size="small" onClick={() => setShowReply(true)}
                sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>Respond</Button>}
              {canRespond && grievance.status !== 'escalated' && (
                <Button size="small" variant="outlined" color="error" onClick={handleEscalate}>Escalate</Button>
              )}
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.8, mb: 2, bgcolor: '#F8FAFC', p: 2, borderRadius: 2 }}>
            {grievance.description}
          </Typography>

          <Stack direction="row" spacing={3} flexWrap="wrap" gap={1}>
            <Box><Typography variant="caption" color="text.secondary">Filed by</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{grievance.citizen_name}</Typography></Box>
            {grievance.dept_name && <Box><Typography variant="caption" color="text.secondary">Department</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{grievance.dept_name}</Typography></Box>}
            <Box><Typography variant="caption" color="text.secondary">Filed on</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(grievance.created_at).toLocaleString('en-IN')}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">SLA</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: grievance.sla_breached ? '#DC2626' : '#059669' }}>
                {grievance.sla_breached ? `${grievance.hours_elapsed}h elapsed (BREACHED)` : `${Math.max(0, grievance.sla_hours - grievance.hours_elapsed)}h remaining`}
              </Typography></Box>
            {grievance.assigned_name && <Box><Typography variant="caption" color="text.secondary">Assigned to</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{grievance.assigned_name}</Typography></Box>}
          </Stack>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Activity Timeline</Typography>
          <Box>
            {grievance.updates?.map((update, i) => {
              const isLast = i === grievance.updates.length - 1;
              const color = ACTION_COLORS[update.action] || '#64748B';
              return (
                <Box key={update.id} sx={{ display: 'flex', gap: 2, mb: isLast ? 0 : 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 36, height: 36 }}>
                      {ACTION_ICONS[update.action] || <Campaign fontSize="small" />}
                    </Avatar>
                    {!isLast && <Box sx={{ flex: 1, width: 2, bgcolor: '#F1F5F9', mt: 1 }} />}
                  </Box>
                  <Box sx={{ flex: 1, pb: isLast ? 0 : 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: NAVY }}>{update.actor_name}</Typography>
                        <Chip label={update.actor_role} size="small" sx={{ height: 18, fontSize: 10, textTransform: 'capitalize' }} />
                        <Chip label={update.action} size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha(color, 0.1), color, fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(update.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                    {update.note && (
                      <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 2, p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6 }}>{update.note}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Reply panel */}
      {showReply && (
        <Card sx={{ mt: 3, border: `1px solid ${alpha(NAVY, 0.2)}` }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Add Response</Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Action</InputLabel>
                  <Select label="Action" value={replyForm.action}
                    onChange={e => setReplyForm(p => ({ ...p, action: e.target.value }))}>
                    {[['RESPONDED','Response'],['ASSIGNED','Assign to Self'],['RESOLVED','Resolve']].map(([v,l]) =>
                      <MenuItem key={v} value={v}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Update Status</InputLabel>
                  <Select label="Update Status" value={replyForm.status}
                    onChange={e => setReplyForm(p => ({ ...p, status: e.target.value }))}>
                    <MenuItem value="">— No change —</MenuItem>
                    {['in_progress','resolved','closed'].map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_',' ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <TextField label="Response Note *" multiline rows={4} value={replyForm.note}
                onChange={e => setReplyForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Provide a detailed response to the citizen's grievance..." />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button onClick={() => setShowReply(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleRespond} disabled={responding || !replyForm.note}
                  startIcon={responding ? <CircularProgress size={16} /> : <Send />}
                  sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
                  {responding ? 'Submitting...' : 'Submit Response'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
