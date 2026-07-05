import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Stack,
  CircularProgress, Alert, alpha
} from '@mui/material';
import { BarChart, Public, Security, Verified, Warning, AccountBalance, AssignmentTurnedIn, TrendingUp } from '@mui/icons-material';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getPublicDashboard, getLedger, verifyChain, getProjects, getProjectStats, getTenders } from '../api';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';
const COLORS = ['#0891B2','#10B981',GOLD,'#8B5CF6','#EF4444'];

export default function PublicTransparency() {
  const [data, setData] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [chain, setChain] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectStats, setProjectStats] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPublicDashboard(),
      getLedger({ page: 1, limit: 10 }),
      getProjects({ limit: 6 }),
      getProjectStats(),
      getTenders(),
    ])
      .then(([d, l, p, ps, t]) => {
        setData(d.data);
        setLedger(l.data.rows);
        setProjects(p.data || []);
        setProjectStats(ps.data);
        setTenders(t.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Demo fallback data when backend returns empty
  const demoData = { total_files: 12, approved_files: 8, total_ledger_blocks: 10, duplicate_beneficiaries: 2 };
  const demoByDept = [
    { dept_name: 'Public Works Department', count: 6 },
    { dept_name: 'Health Department', count: 3 },
    { dept_name: 'Education Department', count: 2 },
    { dept_name: 'Water Resources Department', count: 1 },
  ];
  const demoByStatus = [
    { status: 'approved', count: 8 },
    { status: 'submitted', count: 2 },
    { status: 'under_review', count: 2 },
  ];
  const demoProjects = [
    { id: -1, title: 'Demo Road Repair - Jayanagar', status: 'ongoing', completion_pct: 20 },
    { id: -2, title: 'Demo PHC - Yelahanka', status: 'completed', completion_pct: 100 },
    { id: -3, title: 'Demo Smart Meters', status: 'ongoing', completion_pct: 15 },
    { id: -4, title: 'Demo School Building - Kolar', status: 'delayed', completion_pct: 25 },
    { id: -5, title: 'Demo Rural Roads - Tumkur', status: 'planning', completion_pct: 0 },
  ];
  const demoTenders = [
    { id: -1, title: 'Demo Tender A', status: 'open' },
    { id: -2, title: 'Demo Tender B', status: 'awarded' },
    { id: -3, title: 'Demo Tender C', status: 'open' },
    { id: -4, title: 'Demo Tender D', status: 'closed' },
    { id: -5, title: 'Demo Tender E', status: 'open' },
  ];
  const demoLedger = [
    { id: -101, action_type: 'TENDER_CREATE', actor_email: 'admin@prajakeeya.gov', block_hash: 'abcdef1234567890', timestamp: new Date().toISOString() },
    { id: -102, action_type: 'BID_SUBMIT', actor_email: 'contractor1@gmail.com', block_hash: 'bbbccc111222', timestamp: new Date().toISOString() },
    { id: -103, action_type: 'PO_CREATE', actor_email: 'officer2@prajakeeya.gov', block_hash: 'cccddd333444', timestamp: new Date().toISOString() },
    { id: -104, action_type: 'DOC_ISSUED', actor_email: 'officer1@prajakeeya.gov', block_hash: 'dddfff555666', timestamp: new Date().toISOString() },
    { id: -105, action_type: 'PROJECT_UPDATE', actor_email: 'contractor2@gmail.com', block_hash: 'eee111222333', timestamp: new Date().toISOString() },
  ];

  const dataSafe = data || demoData;
  const byDept = (data?.files_by_dept && data.files_by_dept.length) ? data.files_by_dept : demoByDept;
  const byStatus = (data?.files_by_status && data.files_by_status.length) ? data.files_by_status : demoByStatus;
  const projectsList = (projects && projects.length) ? projects : demoProjects;
  const tendersList = (tenders && tenders.length) ? tenders : demoTenders;
  const ledgerList = (ledger && ledger.length) ? ledger : demoLedger;

  const handleVerify = async () => {
    setVerifying(true);
    try { const r = await verifyChain(); setChain(r.data); }
    finally { setVerifying(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)`, py: 5, px: 3 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Public sx={{ color: GOLD, fontSize: 28 }} />
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Public Transparency Dashboard</Typography>
          </Box>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            ಸಾರ್ವಜನಿಕ ಪಾರದರ್ಶಕತೆ · All government activity is public and immutably recorded
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
        {/* Live stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[
            { label: 'Total Files', value: dataSafe.total_files, color: '#0891B2' },
            { label: 'Approved', value: dataSafe.approved_files, color: '#10B981' },
            { label: 'Ledger Blocks', value: dataSafe.total_ledger_blocks, color: GOLD },
            { label: 'Frauds Blocked', value: dataSafe.duplicate_beneficiaries, color: '#EF4444' },
          ].map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card>
                <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: s.color }}>{s.value ?? '—'}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccountBalance sx={{ color: NAVY }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Budget utilization</Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: GOLD }}>
                  {projectStats ? `${Math.round(((projectStats.totalSpent || 0) / Math.max(projectStats.totalBudget || 1, 1)) * 100)}%` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ₹{((projectStats?.totalSpent || 0) / 10000000).toFixed(1)}Cr spent of ₹{((projectStats?.totalBudget || 0) / 10000000).toFixed(1)}Cr planned
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AssignmentTurnedIn sx={{ color: '#10B981' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tender activity</Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981' }}>{tendersList.length}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {tendersList.filter(t => t.status === 'open').length} active tenders • {tendersList.filter(t => t.status === 'awarded').length} awarded
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp sx={{ color: '#0891B2' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Project performance</Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0891B2' }}>{projectsList.filter(p => p.status === 'completed').length}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed projects out of {projectsList.length} visible initiatives
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Files by Department</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <ReBarChart data={byDept}>
                    <XAxis dataKey="dept_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={NAVY} radius={[4,4,0,0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                      <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}>
                        {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {byStatus.map((s, i) => (
                    <Box key={s.status} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{s.status?.replace('_',' ')}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{s.count}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Chain verify */}
        <Card sx={{ mb: 4, border: `1px solid ${alpha(NAVY, 0.15)}` }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Security sx={{ color: NAVY }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Blockchain Integrity Verification</Typography>
                  <Typography variant="caption" color="text.secondary">Verify that no record has been tampered with</Typography>
                </Box>
              </Box>
              <Button variant="contained" onClick={handleVerify} disabled={verifying}
                startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <Verified />}
                sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
                {verifying ? 'Verifying...' : 'Verify Chain Now'}
              </Button>
            </Box>
            {chain && (
              <Alert severity={chain.valid ? 'success' : 'error'} icon={chain.valid ? <Verified /> : <Warning />}>
                {chain.valid ? `✅ All ${chain.total_blocks} blocks verified — no tampering detected` : `🚨 TAMPERING DETECTED: ${chain.message}`}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent ledger */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent Ledger Activity</Typography>
              <Stack spacing={1.5}>
              {ledgerList.map(block => (
                <Box key={block.id} sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>#{block.id}</Typography>
                    <Chip label={block.action_type.replace(/_/g,' ')} size="small" sx={{ fontSize: 10, fontWeight: 700 }} />
                    <Typography variant="caption" color="text.secondary">{block.actor_email || 'System'}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#0D9488', display: 'block', fontSize: 10 }}>
                      {block.block_hash?.slice(0,24)}...
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(block.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
