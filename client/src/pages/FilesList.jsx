import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button,
  TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, CircularProgress, alpha, Grid
} from '@mui/material';
import { Search, FolderOpen, ArrowForward, FilterList } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getFiles } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';

const STATUS_COLORS = {
  submitted: { color: '#0891B2', bg: '#E0F2FE' },
  under_review: { color: '#D97706', bg: '#FEF3C7' },
  approved: { color: '#059669', bg: '#D1FAE5' },
  rejected: { color: '#DC2626', bg: '#FEE2E2' },
  escalated: { color: '#7C3AED', bg: '#EDE9FE' },
  closed: { color: '#64748B', bg: '#F1F5F9' },
};

const PRIORITY_COLORS = { low: '#94A3B8', normal: '#64748B', high: '#D97706', urgent: '#DC2626' };

function getSlaStatus(file) {
  const hoursElapsed = (Date.now() - new Date(file.created_at).getTime()) / 3600000;
  if (['approved','rejected','closed'].includes(file.status)) return null;
  if (hoursElapsed > file.sla_hours) return { breached: true, hours: Math.round(hoursElapsed) };
  const remaining = Math.max(0, file.sla_hours - hoursElapsed);
  return { breached: false, remaining: Math.round(remaining) };
}

export default function FilesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    getFiles().then(r => setFiles(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = files.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>
          {user?.role === 'citizen' ? 'My Applications' : 'File Management Queue'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {user?.role === 'citizen' ? 'Track all your applications and their status in real-time'
            : 'Review, approve, reject, or escalate pending files within SLA'}
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search files..." size="small" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All Status</MenuItem>
              {['submitted','under_review','approved','rejected','escalated','closed'].map(s => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {user?.role === 'citizen' && (
            <Button variant="contained" onClick={() => navigate('/submit')}
              sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
              + New Application
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FolderOpen sx={{ fontSize: 56, color: '#CBD5E1', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No files found</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map(f => {
            const sla = getSlaStatus(f);
            const sc = STATUS_COLORS[f.status] || STATUS_COLORS.submitted;
            return (
              <Grid item xs={12} md={6} key={f.id}>
                <Card sx={{ height: '100%', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }} onClick={() => navigate(`/files/${f.id}`)}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>{f.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{f.category} · #{f.id}</Typography>
                      </Box>
                      <Chip label={f.status.replace('_', ' ')} size="small"
                        sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, border: `1px solid ${sc.color}33` }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {f.dept_name || 'Department will be assigned shortly'}
                    </Typography>
                    <Stack spacing={1.2} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Application progress</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: sc.color }}>
                          {f.status === 'approved' ? 'Completed' : f.status === 'rejected' ? 'Needs attention' : 'In progress'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Expected timeline</Typography>
                        {sla ? (
                          sla.breached ? (
                            <Chip label={`${sla.hours}h elapsed`} size="small" color="error" variant="outlined" />
                          ) : (
                            <Typography variant="caption" sx={{ color: sla.remaining < 12 ? '#D97706' : '#10B981', fontWeight: 600 }}>
                              {sla.remaining}h left
                            </Typography>
                          )
                        ) : <Typography variant="caption" color="text.secondary">Completed</Typography>}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Priority</Typography>
                        <Typography variant="caption" sx={{ color: PRIORITY_COLORS[f.priority], fontWeight: 600, textTransform: 'capitalize' }}>
                          {f.priority}
                        </Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Filed on {new Date(f.created_at).toLocaleDateString('en-IN')}
                      </Typography>
                      <Button size="small" endIcon={<ArrowForward />} sx={{ color: NAVY }}>View</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
