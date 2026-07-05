import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Stack,
  LinearProgress, Avatar, Divider, Alert, CircularProgress,
  List, ListItem, ListItemText, ListItemAvatar, alpha
} from '@mui/material';
import {
  FolderOpen, ArticleOutlined, Campaign, Add, ArrowForward,
  CheckCircle, Schedule, Error, HourglassEmpty, TrendingUp,
  Description, Bolt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFiles, getMyDocuments, getGrievances } from '../api';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', color: '#0891B2', bg: '#E0F2FE', icon: <HourglassEmpty fontSize="small" /> },
  under_review: { label: 'Under Review', color: '#D97706', bg: '#FEF3C7', icon: <Schedule fontSize="small" /> },
  approved: { label: 'Approved', color: '#059669', bg: '#D1FAE5', icon: <CheckCircle fontSize="small" /> },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: <Error fontSize="small" /> },
  escalated: { label: 'Escalated', color: '#7C3AED', bg: '#EDE9FE', icon: <TrendingUp fontSize="small" /> },
  closed: { label: 'Closed', color: '#64748B', bg: '#F1F5F9', icon: <CheckCircle fontSize="small" /> },
};

function KPICard({ label, labelKn, value, icon, color, sublabel }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: NAVY, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', mt: 0.5 }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8' }}>{labelKn}</Typography>
        {sublabel && <Typography variant="caption" sx={{ display: 'block', color, fontWeight: 600, mt: 0.5 }}>{sublabel}</Typography>}
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, border: `1px solid ${cfg.color}33` }}
    />
  );
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [docs, setDocs] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFiles(), getMyDocuments(), getGrievances()])
      .then(([f, d, g]) => {
        setFiles(f.data);
        setDocs(d.data);
        setGrievances(g.data);
        const activity = [
          ...f.data.slice(0, 4).map(item => ({
            kind: 'application',
            title: item.title,
            subtitle: `${item.category} • ${new Date(item.created_at).toLocaleDateString('en-IN')}`,
            status: item.status,
            date: item.created_at,
            icon: <FolderOpen fontSize="small" />,
          })),
          ...d.data.slice(0, 3).map(item => ({
            kind: 'document',
            title: item.meta?.label || 'Certificate',
            subtitle: item.cert_number || 'Instant document issued',
            status: item.status || 'active',
            date: item.issued_at,
            icon: <Description fontSize="small" />,
          })),
          ...g.data.slice(0, 3).map(item => ({
            kind: 'grievance',
            title: item.subject,
            subtitle: `${item.ticket_id} • ${item.category}`,
            status: item.status,
            date: item.created_at,
            icon: <Campaign fontSize="small" />,
          })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
        setTimelineItems(activity);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending = files.filter(f => ['submitted','under_review','escalated'].includes(f.status)).length;
  const approved = files.filter(f => f.status === 'approved').length;
  const activeDocs = docs.filter(d => d.status === 'active').length;
  const openGrievances = grievances.filter(g => g.status !== 'resolved' && g.status !== 'closed').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>
          ನಮಸ್ಕಾರ, {user?.name?.split(' ')[0]}!
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
          Welcome to your Prajakeeya citizen portal · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      {/* Quick actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/submit')}
          sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)`, py: 1.2, px: 3 }}>
          New Application
        </Button>
        <Button variant="contained" startIcon={<Bolt sx={{ color: '#10B981' }} />} onClick={() => navigate('/documents')}
          sx={{ background: `linear-gradient(135deg, #10B981, #059669)`, py: 1.2, px: 3 }}>
          Get Instant Document
        </Button>
        <Button variant="outlined" startIcon={<Campaign />} onClick={() => navigate('/grievances')}
          sx={{ borderColor: '#E2E8F0', color: NAVY, py: 1.2, px: 3 }}>
          File Grievance
        </Button>
      </Box>

      <Card sx={{ mb: 4, border: `1px solid ${alpha('#0D1B2A', 0.08)}` }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Activity timeline</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>Recent activity across applications, documents, and grievances</Typography>
            </Box>
            <Chip label="Live updates" size="small" sx={{ bgcolor: alpha('#0D1B2A', 0.06), color: NAVY, fontWeight: 700 }} />
          </Box>
          {timelineItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No recent activity yet — start with a new application.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {timelineItems.map((item, idx) => (
                <Box key={`${item.kind}-${idx}`} sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(NAVY, 0.08), color: NAVY, width: 34, height: 34 }}>{item.icon}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: NAVY }}>{item.title}</Typography>
                      <StatusChip status={item.status} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>{item.subtitle}</Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <KPICard label="Pending" labelKn="ಬಾಕಿ ಇರುವ" value={pending} icon={<HourglassEmpty />} color="#D97706"
            sublabel={pending > 0 ? 'Awaiting review' : 'All clear'} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard label="Approved" labelKn="ಅನುಮೋದಿಸಲಾಗಿದೆ" value={approved} icon={<CheckCircle />} color="#059669"
            sublabel={approved > 0 ? `${Math.round(approved / Math.max(files.length, 1) * 100)}% success rate` : ''} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard label="My Documents" labelKn="ನನ್ನ ದಾಖಲೆಗಳು" value={activeDocs} icon={<ArticleOutlined />} color="#0891B2"
            sublabel="Active certificates" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KPICard label="Grievances" labelKn="ದೂರುಗಳು" value={openGrievances} icon={<Campaign />} color="#8B5CF6"
            sublabel={openGrievances > 0 ? 'Open tickets' : 'All resolved'} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Applications */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>My Applications</Typography>
                <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/files')}>View all</Button>
              </Box>
              {loading ? <CircularProgress size={24} /> : files.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FolderOpen sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No applications yet</Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/submit')}>Submit your first application</Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {files.slice(0, 5).map(f => (
                    <Box key={f.id} onClick={() => navigate(`/files/${f.id}`)}
                      sx={{ p: 2, border: '1px solid #F1F5F9', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: '#CBD5E1', bgcolor: '#FAFAFA' }, transition: 'all 0.15s' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: NAVY }}>{f.title}</Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            {f.category} · {new Date(f.created_at).toLocaleDateString('en-IN')}
                          </Typography>
                        </Box>
                        <StatusChip status={f.status} />
                      </Box>
                      {f.status === 'under_review' && (
                        <LinearProgress variant="indeterminate" sx={{ height: 3, borderRadius: 2, bgcolor: '#F1F5F9' }} color="warning" />
                      )}
                      {f.status === 'approved' && (
                        <Alert severity="success" sx={{ py: 0, fontSize: 11, borderRadius: 1.5 }}>
                          Approved — {f.officer_note || 'Application approved successfully.'}
                        </Alert>
                      )}
                      {f.status === 'rejected' && (
                        <Alert severity="error" sx={{ py: 0, fontSize: 11, borderRadius: 1.5 }}>
                          {f.officer_note || 'Application rejected. Please contact the department.'}
                        </Alert>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={5}>
          {/* Instant Documents panel */}
          <Card sx={{ mb: 2.5, border: `1px solid ${alpha('#10B981', 0.2)}`, bgcolor: alpha('#10B981', 0.02) }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Bolt sx={{ color: '#10B981', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>Instant Document Delivery</Typography>
                <Chip label="NEW" size="small" sx={{ bgcolor: '#10B981', color: 'white', fontSize: 9, height: 18, fontWeight: 800 }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', mb: 2, lineHeight: 1.6 }}>
                Get government certificates in seconds — no officer approval needed, no queues.
              </Typography>
              {['Income Certificate', 'Caste Certificate', 'Domicile Certificate', 'Scheme Eligibility'].map(doc => (
                <Box key={doc} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <CheckCircle sx={{ fontSize: 14, color: '#10B981' }} />
                  <Typography variant="caption" sx={{ color: '#374151', fontWeight: 500 }}>{doc}</Typography>
                </Box>
              ))}
              <Button variant="contained" fullWidth size="small" onClick={() => navigate('/documents')} sx={{ mt: 2, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
                Get Documents Instantly
              </Button>
            </CardContent>
          </Card>

          {/* Recent Grievances */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>My Grievances</Typography>
                <Button size="small" onClick={() => navigate('/grievances')}>View all</Button>
              </Box>
              {grievances.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No grievances filed</Typography>
              ) : (
                <Stack spacing={1}>
                  {grievances.slice(0, 3).map(g => (
                    <Box key={g.id} onClick={() => navigate(`/grievances/${g.id}`)}
                      sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: '#F1F5F9' } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: NAVY, fontSize: 12 }}>{g.ticket_id}</Typography>
                        <Chip label={g.status} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} color={g.status === 'resolved' ? 'success' : g.status === 'escalated' ? 'error' : 'default'} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>{g.subject}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              <Button variant="outlined" fullWidth size="small" onClick={() => navigate('/grievances')} sx={{ mt: 1.5, borderColor: '#E2E8F0' }}>
                + File New Grievance
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
