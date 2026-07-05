import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Stack, LinearProgress,
  Tab, Tabs, Avatar, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, alpha, Divider, Paper, IconButton, Tooltip
} from '@mui/material';
import {
  Construction, CheckCircle, Warning, Schedule, Cancel, AccountBalance,
  LocationOn, Person, CalendarToday, AttachMoney, Add, Send, Info,
  TrendingUp, Forum, Update, FilterList
} from '@mui/icons-material';
import { getProjects, getProjectStats, getProjectDetail, fileObjection } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const STATUS_CONFIG = {
  planning:  { label:'Planning',   color:'#8B5CF6', icon:<Schedule fontSize="small" /> },
  ongoing:   { label:'Ongoing',    color:'#0891B2', icon:<Construction fontSize="small" /> },
  completed: { label:'Completed',  color:'#10B981', icon:<CheckCircle fontSize="small" /> },
  delayed:   { label:'Delayed',    color:'#EF4444', icon:<Warning fontSize="small" /> },
  suspended: { label:'Suspended',  color:'#F59E0B', icon:<Cancel fontSize="small" /> },
  cancelled: { label:'Cancelled',  color:'#6B7280', icon:<Cancel fontSize="small" /> },
};

// Demo projects used as fallbacks for richer UI previews
const DEMO_PROJECTS = [
  { id: -1, title: 'Demo Road Repair - Jayanagar', description: 'Road resurfacing and drainage repair in Jayanagar ward.', category: 'Road Infrastructure', status: 'ongoing', completion_pct: 10, budget: 500000, actual_cost: 50000, location: 'Jayanagar, Bengaluru', contractor_name: 'Rajesh Constructions Pvt Ltd' },
  { id: -2, title: 'Demo PHC - Yelahanka', description: 'Primary Health Center construction with OPD and lab.', category: 'Healthcare Infrastructure', status: 'completed', completion_pct: 100, budget: 1200000, actual_cost: 1180000, location: 'Yelahanka', contractor_name: 'BuildRight Infra Solutions' },
  { id: -3, title: 'Demo Smart Meters - North Zone', description: 'Installation of 5000 IoT water meters.', category: 'Water Infrastructure', status: 'ongoing', completion_pct: 20, budget: 450000, actual_cost: 85000, location: 'Bengaluru North Zone', contractor_name: 'AquaTech Water Solutions' },
  { id: -4, title: 'Demo School Building - Kolar', description: 'New government high school with smart classrooms.', category: 'Education Infrastructure', status: 'delayed', completion_pct: 25, budget: 1800000, actual_cost: 450000, location: 'Kolar Town', contractor_name: 'BuildRight Infra Solutions' },
  { id: -5, title: 'Demo Rural Roads - Tumkur', description: 'Connectivity works for 8 villages, all-weather roads.', category: 'Road Infrastructure', status: 'planning', completion_pct: 0, budget: 620000, actual_cost: 0, location: 'Tumkur District', contractor_name: 'Rajesh Constructions Pvt Ltd' },
];

function StatCard({ label, value, sublabel, color, icon }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: color || NAVY }}>{value ?? '—'}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', mt: 0.5 }}>{label}</Typography>
            {sublabel && <Typography variant="caption" sx={{ color: '#94A3B8' }}>{sublabel}</Typography>}
          </Box>
          {icon && <Avatar sx={{ bgcolor: alpha(color || NAVY, 0.1), color: color || NAVY, width: 44, height: 44 }}>{icon}</Avatar>}
        </Box>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project, onClick }) {
  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
  const budget = project.budget ? `₹${(project.budget/100000).toFixed(1)}L` : '—';
  const spent = project.actual_cost ? `₹${(project.actual_cost/100000).toFixed(1)}L` : '₹0';

  return (
    <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' } }}
          onClick={() => onClick(project)}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Chip
            icon={sc.icon}
            label={sc.label}
            size="small"
            sx={{ bgcolor: alpha(sc.color, 0.1), color: sc.color, fontWeight: 700, border: `1px solid ${alpha(sc.color, 0.3)}` }}
          />
          <Chip label={project.category} size="small" variant="outlined" sx={{ color: '#64748B', borderColor: '#E2E8F0' }} />
        </Box>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY, mb: 0.5, lineHeight: 1.3 }}>
          {project.title}
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.description}
        </Typography>

        <Box sx={{ my: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Completion</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: sc.color }}>{project.completion_pct}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={project.completion_pct}
            sx={{ height: 6, borderRadius: 3, bgcolor: alpha(sc.color, 0.1), '& .MuiLinearProgress-bar': { bgcolor: sc.color, borderRadius: 3 } }} />
        </Box>

        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachMoney sx={{ fontSize: 14, color: '#64748B' }} />
              <Typography variant="caption" color="text.secondary">Budget: <strong>{budget}</strong></Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachMoney sx={{ fontSize: 14, color: '#10B981' }} />
              <Typography variant="caption" color="text.secondary">Spent: <strong>{spent}</strong></Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn sx={{ fontSize: 14, color: '#64748B' }} />
              <Typography variant="caption" color="text.secondary" noWrap>{project.location}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Person sx={{ fontSize: 14, color: '#64748B' }} />
              <Typography variant="caption" color="text.secondary">
                {project.contractor_name || 'Contractor TBD'}
                {project.dept_name && <> · {project.dept_name}</>}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          {project.update_count > 0 && (
            <Chip size="small" icon={<Update fontSize="inherit" />} label={`${project.update_count} updates`}
              sx={{ fontSize: 10, height: 20, bgcolor: '#F1F5F9', color: '#64748B' }} />
          )}
          {project.objection_count > 0 && (
            <Chip size="small" icon={<Forum fontSize="inherit" />} label={`${project.objection_count} queries`}
              sx={{ fontSize: 10, height: 20, bgcolor: alpha('#EF4444', 0.08), color: '#EF4444' }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ProjectDetailDialog({ project, open, onClose }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [objTab, setObjTab] = useState(0);
  const [objForm, setObjForm] = useState({ subject: '', description: '', category: 'query' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open || !project) return;
    setLoading(true);
    getProjectDetail(project.id).then(r => {
      const fetched = r.data || {};
      // provide demo updates/objections when none exist for better UX
      if ((!fetched.updates || fetched.updates.length === 0) && project.id < 0) {
        fetched.updates = [
          { id: -201, actor_name: 'Rajesh Constructions', actor_role: 'contractor', update_type: 'milestone', description: 'Site survey and clearing complete.', created_at: '2026-04-10', completion_pct: 5 },
          { id: -202, actor_name: 'Rajesh Constructions', actor_role: 'contractor', update_type: 'progress', description: 'GSB layer laid for first 6km.', created_at: '2026-05-02', completion_pct: 15 },
          { id: -203, actor_name: 'Officer Nagaraj', actor_role: 'officer', update_type: 'progress', description: 'DBM application started at km 0-4.', created_at: '2026-06-20', completion_pct: project.completion_pct },
        ];
      }
      if ((!fetched.objections || fetched.objections.length === 0) && project.id < 0) {
        fetched.objections = [
          { id: -301, citizen_name: 'Priya Sharma', subject: 'Dust nuisance during works', description: 'Heavy dust near residences; request water sprinkling.', category: 'objection', status: 'open', created_at: '2026-06-12' },
          { id: -302, citizen_name: 'Ravi Kumar', subject: 'Traffic diversion plan unclear', description: 'Please display diversion maps.', category: 'query', status: 'answered', response: 'Diversion maps uploaded on site.', responded_at: '2026-06-18' },
        ];
      }
      setDetail(fetched);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, project?.id]);

  const handleSubmitObjection = async () => {
    if (!objForm.subject || !objForm.description) return;
    setSubmitting(true);
    try {
      await fileObjection(project.id, objForm);
      setSuccess('Your query/objection has been filed and is publicly visible.');
      setObjForm({ subject: '', description: '', category: 'query' });
      // Refresh
      const r = await getProjectDetail(project.id);
      setDetail(r.data);
    } catch (e) {
      setSuccess('Error: ' + (e.response?.data?.error || 'Failed'));
    }
    setSubmitting(false);
  };

  const sc = STATUS_CONFIG[project?.status] || STATUS_CONFIG.planning;

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: NAVY, color: '#fff', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Chip icon={sc.icon} label={sc.label} size="small"
              sx={{ bgcolor: alpha(sc.color, 0.2), color: sc.color, border: `1px solid ${alpha(sc.color, 0.4)}`, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{project?.title}</Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>{project?.dept_name} · {project?.category}</Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: GOLD }}>{project?.completion_pct}%</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : detail ? (
          <>
            {/* Key Info */}
            <Box sx={{ p: 3, borderBottom: '1px solid #F1F5F9' }}>
              <Card sx={{ mb: 2, bgcolor: alpha('#0891B2', 0.04), border: `1px solid ${alpha('#0891B2', 0.16)}` }}>
                <CardContent sx={{ p: 2.2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Milestone progress</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Next visible milestone target: every 2 weeks for active work and monthly review for completed phases.
                  </Typography>
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Current progress</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: sc.color }}>{project?.completion_pct}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={project?.completion_pct || 0} sx={{ height: 8, borderRadius: 999, bgcolor: alpha(sc.color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: sc.color, borderRadius: 999 } }} />
                  </Box>
                </CardContent>
              </Card>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{detail.description}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Budget</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>₹{detail.budget?.toLocaleString('en-IN')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Amount Spent</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981' }}>₹{detail.actual_cost?.toLocaleString('en-IN')}</Typography>
                    </Box>
                    <LinearProgress variant="determinate"
                      value={detail.budget > 0 ? Math.min(100, (detail.actual_cost / detail.budget) * 100) : 0}
                      sx={{ height: 6, borderRadius: 3 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Contractor</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{detail.contractor_name}</Typography>
                    </Box>
                    {detail.contractor_type && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Type</Typography>
                        <Typography variant="caption">{detail.contractor_type} · {detail.experience_years}yr exp</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Start Date</Typography>
                      <Typography variant="caption">{detail.start_date}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Expected Completion</Typography>
                      <Typography variant="caption" sx={{ color: detail.status === 'delayed' ? '#EF4444' : 'inherit' }}>
                        {detail.expected_end_date}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Location</Typography>
                      <Typography variant="caption" sx={{ textAlign: 'right', maxWidth: '60%' }}>{detail.location}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            {/* Tabs: Updates | Queries/Objections */}
            <Tabs value={objTab} onChange={(_, v) => setObjTab(v)} sx={{ px: 3, borderBottom: '1px solid #F1F5F9' }}>
              <Tab label={`Progress Updates (${detail.updates?.length || 0})`} />
              <Tab label={`Public Queries & Objections (${detail.objections?.length || 0})`} />
            </Tabs>

            {objTab === 0 && (
              <Box sx={{ p: 3 }}>
                {detail.updates?.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No updates yet.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {detail.updates.map((u, i) => (
                      <Box key={u.id} sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: u.update_type === 'completion' ? '#10B981' : u.update_type === 'delay' ? '#EF4444' : NAVY, fontSize: 12 }}>
                            {u.actor_role === 'contractor' ? 'C' : 'O'}
                          </Avatar>
                          {i < detail.updates.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: '#E2E8F0', mt: 0.5 }} />}
                        </Box>
                        <Box sx={{ flex: 1, pb: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                            <Chip size="small" label={u.update_type.toUpperCase()} sx={{ fontSize: 10, height: 18,
                              bgcolor: u.update_type === 'delay' ? alpha('#EF4444', 0.1) : u.update_type === 'completion' ? alpha('#10B981', 0.1) : alpha(NAVY, 0.05),
                              color: u.update_type === 'delay' ? '#EF4444' : u.update_type === 'completion' ? '#10B981' : NAVY }} />
                            <Typography variant="caption" color="text.secondary">{u.actor_name} · {new Date(u.created_at).toLocaleDateString('en-IN')}</Typography>
                            {u.completion_pct !== null && <Chip size="small" label={`${u.completion_pct}%`} sx={{ fontSize: 10, height: 18, bgcolor: alpha(GOLD, 0.1), color: '#92400E' }} />}
                          </Box>
                          <Typography variant="body2">{u.description}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {objTab === 1 && (
              <Box sx={{ p: 3 }}>
                {user?.role === 'citizen' && (
                  <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, borderColor: alpha(GOLD, 0.4), bgcolor: alpha(GOLD, 0.03) }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Raise a Query or Objection</Typography>
                    {success && <Alert severity={success.startsWith('Error') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={8}>
                        <TextField fullWidth size="small" label="Subject" value={objForm.subject}
                          onChange={e => setObjForm(f => ({ ...f, subject: e.target.value }))} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Type</InputLabel>
                          <Select value={objForm.category} label="Type" onChange={e => setObjForm(f => ({ ...f, category: e.target.value }))}>
                            <MenuItem value="query">Query</MenuItem>
                            <MenuItem value="objection">Objection</MenuItem>
                            <MenuItem value="complaint">Complaint</MenuItem>
                            <MenuItem value="suggestion">Suggestion</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" label="Description" multiline rows={3} value={objForm.description}
                          onChange={e => setObjForm(f => ({ ...f, description: e.target.value }))} />
                      </Grid>
                      <Grid item xs={12}>
                        <Button variant="contained" endIcon={<Send />} disabled={submitting || !objForm.subject || !objForm.description}
                          onClick={handleSubmitObjection} sx={{ bgcolor: NAVY }}>
                          {submitting ? 'Submitting...' : 'Submit Publicly'}
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          Visible to all citizens. Officers will respond officially.
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                )}

                {detail.objections?.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">No public queries yet. Be the first to ask!</Typography>
                ) : (
                  <Stack spacing={2}>
                    {detail.objections.map(obj => (
                      <Paper key={obj.id} variant="outlined" sx={{ p: 2, borderRadius: 2,
                        borderColor: obj.status === 'answered' ? alpha('#10B981', 0.3) : obj.category === 'objection' ? alpha('#EF4444', 0.3) : '#E2E8F0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip size="small" label={obj.category.toUpperCase()} sx={{ fontSize: 10, height: 18,
                              bgcolor: obj.category === 'objection' ? alpha('#EF4444', 0.1) : obj.category === 'complaint' ? alpha('#D97706', 0.1) : alpha('#0891B2', 0.1),
                              color: obj.category === 'objection' ? '#EF4444' : obj.category === 'complaint' ? '#D97706' : '#0891B2' }} />
                            <Chip size="small" label={obj.status === 'answered' ? 'ANSWERED' : 'OPEN'} sx={{ fontSize: 10, height: 18,
                              bgcolor: obj.status === 'answered' ? alpha('#10B981', 0.1) : alpha('#F59E0B', 0.1),
                              color: obj.status === 'answered' ? '#10B981' : '#D97706' }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary">{new Date(obj.created_at).toLocaleDateString('en-IN')}</Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{obj.subject}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{obj.description}</Typography>
                        <Typography variant="caption" color="text.secondary">— {obj.citizen_name}</Typography>

                        {obj.response && (
                          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: alpha('#10B981', 0.05), borderRadius: 1.5, borderLeft: '3px solid #10B981' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#10B981', display: 'block', mb: 0.5 }}>
                              OFFICIAL RESPONSE
                            </Typography>
                            <Typography variant="body2">{obj.response}</Typography>
                            <Typography variant="caption" color="text.secondary">— {new Date(obj.responded_at).toLocaleDateString('en-IN')}</Typography>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </>
        ) : <Alert severity="error" sx={{ m: 3 }}>Failed to load project details.</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #F1F5F9' }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    Promise.all([
      getProjects({ status: filterStatus || undefined, category: filterCategory || undefined }),
      getProjectStats()
    ]).then(([pr, sr]) => {
      // use API projects; if too few, merge demo projects for better preview
      const apiProjects = pr.data || [];
      const projectsToShow = apiProjects.length >= 5 ? apiProjects : [...apiProjects, ...DEMO_PROJECTS.filter(d => !apiProjects.find(p => p.id === d.id))].slice(0,6);
      setProjects(projectsToShow);
      setStats(sr.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterStatus, filterCategory]);

  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Public Development Projects</Typography>
        <Typography variant="body2" color="text.secondary">
          ಸಾರ್ವಜನಿಕ ಅಭಿವೃದ್ಧಿ ಯೋಜನೆಗಳು · All government projects, contractors, costs, and timelines — publicly visible
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Total Projects" value={stats?.total} color={NAVY} icon={<AccountBalance />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Ongoing" value={stats?.ongoing} color="#0891B2" icon={<Construction />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Completed" value={stats?.completed} color="#10B981" icon={<CheckCircle />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Delayed" value={stats?.delayed} color="#EF4444" icon={<Warning />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Total Budget" value={`₹${((stats?.totalBudget||0)/10000000).toFixed(1)}Cr`} color={GOLD} icon={<AttachMoney />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard label="Amount Spent" value={`₹${((stats?.totalSpent||0)/10000000).toFixed(1)}Cr`} color="#10B981" icon={<TrendingUp />} /></Grid>
      </Grid>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterList sx={{ color: '#64748B' }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="">All Status</MenuItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCategory} label="Category" onChange={e => setFilterCategory(e.target.value)}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        {(filterStatus || filterCategory) && (
          <Button size="small" onClick={() => { setFilterStatus(''); setFilterCategory(''); }}>Clear</Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          Showing {projects.length} project{projects.length !== 1 ? 's' : ''}
        </Typography>
      </Paper>

      {/* Project Grid */}
      <Grid container spacing={3}>
        {projects.map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <ProjectCard project={p} onClick={setSelected} />
          </Grid>
        ))}
      </Grid>

      {projects.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Construction sx={{ fontSize: 48, color: '#E2E8F0', mb: 2 }} />
          <Typography color="text.secondary">No projects found matching the filters.</Typography>
        </Box>
      )}

      <ProjectDetailDialog project={selected} open={!!selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
