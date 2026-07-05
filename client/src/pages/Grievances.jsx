import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Avatar, alpha
} from '@mui/material';
import { Campaign, Add, ArrowForward, Schedule, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getGrievances, createGrievance } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';

const STATUS_MAP = {
  open: { color: '#0891B2', bg: '#E0F2FE', label: 'Open' },
  in_progress: { color: '#D97706', bg: '#FEF3C7', label: 'In Progress' },
  resolved: { color: '#059669', bg: '#D1FAE5', label: 'Resolved' },
  escalated: { color: '#DC2626', bg: '#FEE2E2', label: 'Escalated' },
  closed: { color: '#64748B', bg: '#F1F5F9', label: 'Closed' },
};
const PRIORITY_MAP = {
  low: '#94A3B8', medium: '#D97706', high: '#EF4444', critical: '#7C3AED'
};

export default function Grievances() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ subject: '', description: '', category: 'service', priority: 'medium', dept_id: '' });

  const load = () => {
    setLoading(true);
    getGrievances().then(r => setGrievances(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Demo fallback data (shown when API returns empty)
  const demoGrievances = [
    { id: -1, ticket_id: 'GRV-DEMO-101', subject: 'Street light outage - Demo', citizen_name: 'Ravi Kumar', category: 'service', priority: 'high', status: 'open', sla_hours: 72, created_at: '2026-06-10' },
    { id: -2, ticket_id: 'GRV-DEMO-102', subject: 'Water contamination - Demo', citizen_name: 'Priya Sharma', category: 'service', priority: 'critical', status: 'in_progress', sla_hours: 72, created_at: '2026-06-12' },
    { id: -3, ticket_id: 'GRV-DEMO-103', subject: 'Pothole causing accidents - Demo', citizen_name: 'Suresh Patil', category: 'service', priority: 'high', status: 'resolved', sla_hours: 72, created_at: '2026-06-05' },
    { id: -4, ticket_id: 'GRV-DEMO-104', subject: 'Teacher absent — Demo', citizen_name: 'Ravi Kumar', category: 'service', priority: 'medium', status: 'closed', sla_hours: 72, created_at: '2026-06-15' },
    { id: -5, ticket_id: 'GRV-DEMO-105', subject: 'Request: Online slot booking - Demo', citizen_name: 'Priya Sharma', category: 'other', priority: 'low', status: 'open', sla_hours: 72, created_at: '2026-06-18' },
  ];

  const displayedGrievances = grievances.length > 0 ? grievances : demoGrievances;

  const handleSubmit = async () => {
    if (!form.subject || !form.description) return;
    setSubmitting(true);
    try {
      const res = await createGrievance(form);
      setMsg({ type: 'success', text: `Grievance filed! Your ticket ID: ${res.data.ticket_id}` });
      setOpen(false);
      setForm({ subject: '', description: '', category: 'service', priority: 'medium' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to file grievance' });
    } finally { setSubmitting(false); }
  };

  const pending = displayedGrievances.filter(g => ['open','in_progress','escalated'].includes(g.status)).length;
  const resolved = displayedGrievances.filter(g => g.status === 'resolved').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>
            {user?.role === 'citizen' ? 'My Grievances' : 'Grievance Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {user?.role === 'citizen'
              ? 'Track your complaints and get resolution updates in real-time'
              : 'Review and respond to citizen grievances within SLA'}
          </Typography>
        </Box>
        {user?.role === 'citizen' && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}
            sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
            File Grievance
          </Button>
        )}
      </Box>

      {msg && <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* Stats bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {[
          { label: 'Total', value: grievances.length, color: NAVY },
          { label: 'Open / Pending', value: pending, color: '#0891B2' },
          { label: 'Resolved', value: resolved, color: '#059669' },
          { label: 'Escalated', value: grievances.filter(g => g.status === 'escalated').length, color: '#DC2626' },
        ].map(s => (
          <Card key={s.label} sx={{ flex: 1, minWidth: 120 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : displayedGrievances.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Campaign sx={{ fontSize: 56, color: '#CBD5E1', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No grievances found</Typography>
          {user?.role === 'citizen' && (
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => setOpen(true)}>File Your First Grievance</Button>
          )}
        </Box>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket ID</TableCell>
                  <TableCell>Subject</TableCell>
                  {user?.role !== 'citizen' && <TableCell>Citizen</TableCell>}
                  <TableCell>Category</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>SLA</TableCell>
                  <TableCell>Filed</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedGrievances.map(g => {
                  const sc = STATUS_MAP[g.status] || STATUS_MAP.open;
                  const hoursElapsed = (Date.now() - new Date(g.created_at).getTime()) / 3600000;
                  const slaBreached = hoursElapsed > g.sla_hours && !['resolved','closed'].includes(g.status);
                  return (
                    <TableRow key={g.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/grievances/${g.id}`)}>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0891B2' }}>
                          {g.ticket_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 220 }}>{g.subject}</Typography>
                      </TableCell>
                      {user?.role !== 'citizen' && (
                        <TableCell><Typography variant="caption">{g.citizen_name}</Typography></TableCell>
                      )}
                      <TableCell>
                        <Chip label={g.category} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: PRIORITY_MAP[g.priority], fontWeight: 700, textTransform: 'capitalize' }}>
                          {g.priority}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        {slaBreached ? (
                          <Chip label="SLA BREACHED" size="small" color="error" icon={<Warning sx={{ fontSize: 12 }} />} />
                        ) : (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(Math.max(0, g.sla_hours - hoursElapsed))}h left
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#0891B2', display: 'block' }}>
                              Expected resolution window
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(g.created_at).toLocaleDateString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell><ArrowForward fontSize="small" sx={{ color: '#94A3B8' }} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* File grievance dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Campaign sx={{ color: '#0891B2' }} />
            File a Grievance · ದೂರು ದಾಖಲಿಸಿ
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your grievance will be assigned a unique ticket ID and must be resolved within 72 hours. SLA breach auto-escalates to senior officer.
          </Alert>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Subject *" value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Brief description of your complaint" />
            <TextField label="Detailed Description *" multiline rows={4} value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Provide complete details — include dates, officers involved, reference numbers..." />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {[['delay','Delay in Service'],['corruption','Corruption/Bribery'],['service','Poor Service'],['other','Other']].map(([v,l]) =>
                    <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {['low','medium','high','critical'].map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || !form.subject || !form.description}
            startIcon={submitting ? <CircularProgress size={16} /> : <Campaign />}
            sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
            {submitting ? 'Filing...' : 'Submit Grievance'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
