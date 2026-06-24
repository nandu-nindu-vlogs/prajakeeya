import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Stack, Tab, Tabs,
  Button, TextField, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, alpha, Paper, Divider, Avatar,
  LinearProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip
} from '@mui/material';
import {
  Business, Description, AccountBalance, CheckCircle, Warning,
  Send, Edit, Shield, Star, TrendingUp, Gavel, Lock, Visibility
} from '@mui/icons-material';
import {
  getContractorProfile, updateContractorProfile, getMyBids,
  getTenders, getProjectStats, getMyContractorProjects, submitBid, getTenderDetail
} from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const CONTRACTOR_TYPES = ['Civil', 'Electrical', 'Mechanical', 'Hydraulic', 'IT & Technology', 'General', 'Environmental'];

function ProfileCard({ profile, onEdit }) {
  if (!profile) return null;
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: NAVY, fontSize: 20 }}>
              {profile.company_name?.[0] || 'C'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{profile.company_name}</Typography>
              <Typography variant="body2" color="text.secondary">{profile.contractor_type} Contractor</Typography>
            </Box>
          </Box>
          <Box>
            {profile.verified ? (
              <Chip icon={<Shield fontSize="small" />} label="Verified" size="small"
                sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981', border: '1px solid #10B981', fontWeight: 700 }} />
            ) : (
              <Chip label="Pending Verification" size="small"
                sx={{ bgcolor: alpha(GOLD, 0.1), color: '#92400E', border: `1px solid ${alpha(GOLD, 0.4)}` }} />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          {[
            { label: 'License No', value: profile.license_no },
            { label: 'GST Number', value: profile.gst_no },
            { label: 'PAN', value: profile.pan_no },
            { label: 'Experience', value: `${profile.experience_years} years` },
            { label: 'Annual Turnover', value: `₹${profile.turnover_cr}Cr` },
            { label: 'Specialization', value: profile.specialization },
            { label: 'Address', value: profile.address },
          ].map(f => (
            <Grid item xs={12} sm={6} key={f.label}>
              <Typography variant="caption" color="text.secondary">{f.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.value || '—'}</Typography>
            </Grid>
          ))}
        </Grid>
        <Button variant="outlined" startIcon={<Edit />} size="small" sx={{ mt: 2, borderColor: NAVY, color: NAVY }}
          onClick={onEdit}>Edit Profile</Button>
      </CardContent>
    </Card>
  );
}

function BidDialog({ tender, open, onClose, onBidSubmit }) {
  const [form, setForm] = useState({ amount: '', technical_score: '', proposal: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!form.amount) return;
    setSubmitting(true);
    try {
      await submitBid(tender.id, form);
      setResult({ success: true, msg: 'Bid submitted and SEALED until deadline. No one can see your bid amount until the deadline.' });
      onBidSubmit();
    } catch (e) {
      setResult({ success: false, msg: e.response?.data?.error || 'Failed to submit bid' });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: NAVY, color: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock /> Submit Sealed Bid
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {tender && (
          <Alert severity="info" sx={{ mb: 2 }} icon={<Lock />}>
            Your bid is sealed until <strong>{new Date(tender.deadline).toLocaleDateString('en-IN')}</strong>.
            No one — including admins — can see your bid amount until the deadline.
          </Alert>
        )}
        {result && (
          <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>{result.msg}</Alert>
        )}
        {!result?.success && (
          <Stack spacing={2}>
            <TextField label="Bid Amount (₹)" type="number" fullWidth value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              helperText={tender ? `Budget: ₹${tender.budget?.toLocaleString('en-IN')}` : ''} />
            <TextField label="Technical Score (0-100)" type="number" fullWidth value={form.technical_score}
              onChange={e => setForm(f => ({ ...f, technical_score: e.target.value }))}
              helperText="Self-assessed technical capability score" />
            <TextField label="Proposal / Technical Approach" multiline rows={4} fullWidth value={form.proposal}
              onChange={e => setForm(f => ({ ...f, proposal: e.target.value }))} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {!result?.success && (
          <Button variant="contained" startIcon={<Send />} disabled={submitting || !form.amount}
            onClick={handleSubmit} sx={{ bgcolor: NAVY }}>
            {submitting ? 'Submitting...' : 'Submit Sealed Bid'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [bids, setBids] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(false);
  const [bidTarget, setBidTarget] = useState(null);
  const [profileForm, setProfileForm] = useState({});

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getContractorProfile().catch(() => ({ data: null })),
      getMyBids().catch(() => ({ data: [] })),
      getTenders().catch(() => ({ data: [] })),
      getMyContractorProjects().catch(() => ({ data: { projects: [], bids: [] } })),
    ]).then(([p, b, t, cp]) => {
      setProfile(p.data);
      setBids(b.data);
      setTenders(t.data.filter(t => t.status === 'open'));
      setMyProjects(cp.data?.projects || []);
      if (p.data) setProfileForm(p.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveProfile = async () => {
    try {
      await updateContractorProfile(profileForm);
      setEditProfile(false);
      loadData();
    } catch (e) {}
  };

  const alreadyBid = (tenderId) => bids.some(b => b.tender_id === tenderId || b.id && tenders.find(t=>t.id===tenderId));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Contractor Portal</Typography>
        <Typography variant="body2" color="text.secondary">
          ಗುತ್ತಿಗೆದಾರ ಪೋರ್ಟಲ್ · Manage your profile, bids, and projects
        </Typography>
      </Box>

      {!profile && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Complete your contractor profile to start bidding on government tenders.
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><Card><CardContent sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: NAVY }}>{bids.length}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Total Bids</Typography>
        </CardContent></Card></Grid>
        <Grid item xs={6} sm={3}><Card><CardContent sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981' }}>{bids.filter(b => b.is_winner).length}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Tenders Won</Typography>
        </CardContent></Card></Grid>
        <Grid item xs={6} sm={3}><Card><CardContent sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0891B2' }}>{myProjects.length}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Active Projects</Typography>
        </CardContent></Card></Grid>
        <Grid item xs={6} sm={3}><Card><CardContent sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: GOLD }}>{tenders.length}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Open Tenders</Typography>
        </CardContent></Card></Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #E2E8F0' }}>
        <Tab label="My Profile" />
        <Tab label={`Open Tenders (${tenders.length})`} />
        <Tab label={`My Bids (${bids.length})`} />
        <Tab label={`My Projects (${myProjects.length})`} />
      </Tabs>

      {/* Tab 0: Profile */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <ProfileCard profile={profile} onEdit={() => setEditProfile(true)} />
          </Grid>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>How to Bid</Typography>
                <Stack spacing={2}>
                  {[
                    { n: 1, t: 'Complete your profile', d: 'Fill in company details, license, GST, and specialization.' },
                    { n: 2, t: 'Browse Open Tenders', d: 'View all government tenders open for bidding.' },
                    { n: 3, t: 'Submit Sealed Bid', d: 'Your bid is encrypted and sealed until the deadline.' },
                    { n: 4, t: 'Composite Scoring', d: 'Price (40%) + Technical Score (60%) determines winner.' },
                    { n: 5, t: 'All on Public Ledger', d: 'Every bid and award is recorded immutably.' },
                  ].map(s => (
                    <Box key={s.n} sx={{ display: 'flex', gap: 2 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: NAVY, fontSize: 13 }}>{s.n}</Avatar>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{s.t}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">{s.d}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Open Tenders */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {tenders.length === 0 && <Grid item xs={12}><Alert severity="info">No open tenders right now.</Alert></Grid>}
          {tenders.map(t => {
            const hasBid = bids.some(b => b.tender_id === t.id);
            const deadline = new Date(t.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000*60*60*24));
            return (
              <Grid item xs={12} sm={6} key={t.id}>
                <Card sx={{ border: hasBid ? `2px solid #10B981` : '1px solid #E2E8F0' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={t.category} size="small" variant="outlined" sx={{ color: '#64748B' }} />
                      {hasBid && <Chip icon={<CheckCircle fontSize="small" />} label="Bid Submitted" size="small"
                        sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981' }} />}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{t.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.dept_name}</Typography>
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Budget</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{t.budget?.toLocaleString('en-IN')}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Deadline</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: daysLeft < 7 ? '#EF4444' : '#374151' }}>
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Bids Received</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}><Lock fontSize="inherit" sx={{ fontSize: 12 }} /> {t.bid_count} (sealed)</Typography>
                      </Grid>
                    </Grid>
                    <Button variant="contained" fullWidth size="small" sx={{ mt: 2, bgcolor: hasBid ? '#64748B' : NAVY }}
                      disabled={hasBid || daysLeft <= 0 || !profile}
                      startIcon={hasBid ? <CheckCircle /> : <Gavel />}
                      onClick={() => setBidTarget(t)}>
                      {hasBid ? 'Bid Submitted' : daysLeft <= 0 ? 'Deadline Passed' : !profile ? 'Complete Profile First' : 'Submit Bid'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Tab 2: My Bids */}
      {tab === 2 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tender</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bid Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tech Score</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Composite</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bids.map(b => (
                <TableRow key={b.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 200 }}>{b.tender_title}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption">{b.dept_name}</Typography></TableCell>
                  <TableCell>
                    {b.revealed ? `₹${b.amount?.toLocaleString('en-IN')}` : (
                      <Chip icon={<Lock fontSize="inherit" />} label="Sealed" size="small"
                        sx={{ fontSize: 10, bgcolor: alpha('#64748B', 0.1), color: '#64748B' }} />
                    )}
                  </TableCell>
                  <TableCell>{b.revealed ? `${b.technical_score}/100` : '—'}</TableCell>
                  <TableCell>
                    {b.score != null ? (
                      <Chip label={`${b.score}`} size="small"
                        sx={{ bgcolor: b.is_winner ? alpha('#10B981', 0.1) : alpha(NAVY, 0.05),
                          color: b.is_winner ? '#10B981' : NAVY, fontWeight: 700 }} />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {b.is_winner ? (
                      <Chip icon={<Star fontSize="small" />} label="WON" size="small"
                        sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981', fontWeight: 700 }} />
                    ) : b.tender_status === 'awarded' ? (
                      <Chip label="Not selected" size="small" sx={{ color: '#64748B' }} />
                    ) : (
                      <Chip icon={<Lock fontSize="small" />} label="Sealed" size="small"
                        sx={{ bgcolor: alpha(GOLD, 0.1), color: '#92400E' }} />
                    )}
                  </TableCell>
                  <TableCell><Typography variant="caption">{new Date(b.submitted_at).toLocaleDateString('en-IN')}</Typography></TableCell>
                </TableRow>
              ))}
              {bids.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: '#94A3B8' }}>No bids submitted yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: My Projects */}
      {tab === 3 && (
        <Grid container spacing={3}>
          {myProjects.length === 0 && <Grid item xs={12}><Alert severity="info">No projects assigned yet. Win a tender to get your first project!</Alert></Grid>}
          {myProjects.map(p => (
            <Grid item xs={12} sm={6} key={p.id}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip label={p.status.toUpperCase()} size="small"
                      sx={{ bgcolor: p.status === 'completed' ? alpha('#10B981', 0.1) : p.status === 'delayed' ? alpha('#EF4444', 0.1) : alpha('#0891B2', 0.1),
                        color: p.status === 'completed' ? '#10B981' : p.status === 'delayed' ? '#EF4444' : '#0891B2', fontWeight: 700 }} />
                    <Typography variant="caption" color="text.secondary">{p.dept_name}</Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{p.title}</Typography>
                  <Box sx={{ my: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Completion</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{p.completion_pct}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={p.completion_pct} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Budget</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{p.budget?.toLocaleString('en-IN')}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">End Date</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.expected_end_date}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={editProfile} onClose={() => setEditProfile(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: NAVY, color: '#fff' }}>Edit Contractor Profile</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Company Name', key: 'company_name' },
              { label: 'License Number', key: 'license_no' },
              { label: 'GST Number', key: 'gst_no' },
              { label: 'PAN Number', key: 'pan_no' },
              { label: 'Experience (Years)', key: 'experience_years', type: 'number' },
              { label: 'Annual Turnover (Cr)', key: 'turnover_cr', type: 'number' },
              { label: 'Address', key: 'address' },
              { label: 'Specialization', key: 'specialization' },
            ].map(f => (
              <Grid item xs={12} sm={6} key={f.key}>
                <TextField fullWidth size="small" label={f.label} type={f.type || 'text'}
                  value={profileForm[f.key] || ''}
                  onChange={e => setProfileForm(pf => ({ ...pf, [f.key]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Contractor Type</InputLabel>
                <Select value={profileForm.contractor_type || ''} label="Contractor Type"
                  onChange={e => setProfileForm(pf => ({ ...pf, contractor_type: e.target.value }))}>
                  {CONTRACTOR_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditProfile(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProfile} sx={{ bgcolor: NAVY }}>Save Profile</Button>
        </DialogActions>
      </Dialog>

      {/* Bid Dialog */}
      {bidTarget && (
        <BidDialog tender={bidTarget} open={!!bidTarget} onClose={() => setBidTarget(null)}
          onBidSubmit={() => { setBidTarget(null); loadData(); }} />
      )}
    </Box>
  );
}
