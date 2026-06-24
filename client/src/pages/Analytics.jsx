import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Avatar, LinearProgress, alpha
} from '@mui/material';
import { BarChart, ShowChart, PieChart, Warning, CheckCircle, TrendingUp, Speed } from '@mui/icons-material';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { getAnalyticsOverview, getSlaAnalytics, getOfficerAnalytics, getFraudAnalytics } from '../api';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';
const COLORS = ['#0891B2', '#10B981', GOLD, '#8B5CF6', '#EF4444', '#F59E0B'];

function KPICard({ label, value, sublabel, color, icon }) {
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

export default function Analytics() {
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [sla, setSla] = useState(null);
  const [officers, setOfficers] = useState(null);
  const [fraud, setFraud] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalyticsOverview(), getSlaAnalytics(), getOfficerAnalytics(), getFraudAnalytics()])
      .then(([o, s, of, f]) => { setOverview(o.data); setSla(s.data); setOfficers(of.data); setFraud(f.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const k = overview?.kpis || {};

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Analytics & Insights</Typography>
        <Typography variant="body2" color="text.secondary">Real-time governance performance dashboard · ಆಡಳಿತ ಕಾರ್ಯಕ್ಷಮತೆ</Typography>
      </Box>

      {/* KPI row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}><KPICard label="Total Files" value={k.totalFiles} color="#0891B2" icon={<BarChart />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KPICard label="Approval Rate" value={`${k.approvalRate}%`} color="#10B981" icon={<CheckCircle />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KPICard label="SLA Compliance" value={`${sla?.complianceRate ?? '—'}%`} color={sla?.complianceRate >= 80 ? '#10B981' : '#EF4444'} icon={<Speed />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KPICard label="Frauds Blocked" value={k.duplicatesBlocked} color="#EF4444" icon={<Warning />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KPICard label="Open Alerts" value={k.openAlerts} color={k.openAlerts > 0 ? '#D97706' : '#10B981'} icon={<TrendingUp />} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KPICard label="Docs Issued" value={k.docsIssued} color="#8B5CF6" icon={<ShowChart />} /></Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #E2E8F0' }}>
        <Tab label="Overview" />
        <Tab label="SLA Performance" />
        <Tab label="Officer Scorecards" />
        <Tab label="Fraud Analysis" />
      </Tabs>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Files by Department</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <ReBarChart data={overview?.byDept}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="dept" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4,4,0,0]} />
                    <Bar dataKey="pending" name="Pending" fill={GOLD} radius={[4,4,0,0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4,4,0,0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie data={overview?.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {overview?.byStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {overview?.byStatus?.map((s, i) => (
                    <Box key={s.status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{s.status.replace('_',' ')}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{s.count}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Application Trend (Last 14 Days)</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={overview?.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke={NAVY} strokeWidth={2} dot={{ r: 4, fill: GOLD }} name="Applications" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: SLA */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 800, color: sla?.complianceRate >= 80 ? '#10B981' : '#EF4444' }}>
                  {sla?.complianceRate}%
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>SLA Compliance Rate</Typography>
                <Typography variant="body2" color="text.secondary">{sla?.total_breaches} active SLA breaches</Typography>
                <LinearProgress
                  variant="determinate" value={sla?.complianceRate || 0}
                  color={sla?.complianceRate >= 80 ? 'success' : 'error'}
                  sx={{ mt: 2, height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Avg Resolution Time by Department</Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <ReBarChart data={sla?.avgByDept} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="dept" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [`${v}h`, 'Avg Resolution']} />
                    <Bar dataKey="avg_hours" name="Avg Hours" fill="#0891B2" radius={[0,4,4,0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  SLA Breach Cases ({sla?.slaBreaches?.length})
                </Typography>
                {sla?.slaBreaches?.length === 0 ? (
                  <Alert severity="success">No SLA breaches — all active files within time limits!</Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>File</TableCell><TableCell>Department</TableCell>
                        <TableCell>Status</TableCell><TableCell>Hours Elapsed</TableCell><TableCell>SLA Limit</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {sla?.slaBreaches?.map(b => (
                          <TableRow key={b.id}>
                            <TableCell><Typography variant="caption" sx={{ fontWeight: 600 }}>{b.title}</Typography></TableCell>
                            <TableCell><Typography variant="caption">{b.dept}</Typography></TableCell>
                            <TableCell><Chip label={b.status.replace('_',' ')} size="small" /></TableCell>
                            <TableCell><Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700 }}>{b.hours_elapsed}h</Typography></TableCell>
                            <TableCell><Typography variant="caption">{b.sla_hours}h</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Officers */}
      {tab === 2 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Officer Performance Scorecards</Typography>
            {officers?.rapidApprovals?.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Anomaly Detected:</strong> {officers.rapidApprovals.length} officer(s) made rapid approvals in the last hour — potential integrity risk.
              </Alert>
            )}
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell>Officer</TableCell><TableCell>Department</TableCell>
                  <TableCell align="center">Files Actioned</TableCell>
                  <TableCell align="center">Approved</TableCell><TableCell align="center">Rejected</TableCell>
                  <TableCell align="center">Escalated</TableCell><TableCell>Avg Response</TableCell>
                  <TableCell>Score</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {officers?.officers?.map(o => {
                    const score = o.files_actioned === 0 ? 0 : Math.round(
                      ((o.approved || 0) / o.files_actioned * 40) +
                      (Math.max(0, 48 - (o.avg_response_hours || 48)) / 48 * 40) +
                      (1 - (o.escalated || 0) / Math.max(1, o.files_actioned)) * 20
                    );
                    const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#D97706' : '#EF4444';
                    return (
                      <TableRow key={o.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#0891B2', fontSize: 13 }}>{o.name?.[0]}</Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{o.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="caption">{o.dept || '—'}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" sx={{ fontWeight: 700 }}>{o.files_actioned || 0}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" sx={{ color: '#10B981', fontWeight: 600 }}>{o.approved || 0}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 600 }}>{o.rejected || 0}</Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" sx={{ color: '#D97706', fontWeight: 600 }}>{o.escalated || 0}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: (o.avg_response_hours || 0) > 48 ? '#DC2626' : '#10B981', fontWeight: 600 }}>
                            {o.avg_response_hours ? `${o.avg_response_hours}h` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: scoreColor }}>{score}</Typography>
                            <LinearProgress variant="determinate" value={score}
                              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9',
                                '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 3 } }} />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Fraud */}
      {tab === 3 && (
        <Grid container spacing={3}>
          {fraud?.duplicateBeneficiaries?.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ border: '1px solid #FCA5A5' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Warning sx={{ color: '#DC2626' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#DC2626' }}>
                      Ghost Beneficiary Attempts Blocked ({fraud.duplicateBeneficiaries.length})
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow>
                        <TableCell>Name</TableCell><TableCell>Aadhaar</TableCell>
                        <TableCell>Scheme</TableCell><TableCell>Attempts</TableCell><TableCell>Date</TableCell>
                      </TableRow></TableHead>
                      <TableBody>
                        {fraud.duplicateBeneficiaries.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell>{d.name}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{d.aadhaar_id}</TableCell>
                            <TableCell>{d.scheme}</TableCell>
                            <TableCell><Chip label={d.attempts} size="small" color="error" /></TableCell>
                            <TableCell>{new Date(d.created_at).toLocaleDateString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Alert Activity (30 days)</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <ReBarChart data={fraud?.alerts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#EF4444" radius={[4,4,0,0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Invoice Mismatches / 3-Way Fails</Typography>
                {fraud?.invoiceMismatches?.length === 0 ? (
                  <Alert severity="success">No invoice mismatches detected.</Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {fraud?.invoiceMismatches?.map((m, i) => (
                      <Box key={i} sx={{ p: 1.5, bgcolor: '#FFF7ED', borderRadius: 2, border: '1px solid #FDBA74' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.vendor_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#92400E' }}>
                          PO: ₹{m.po_amount?.toLocaleString('en-IN')} vs Invoice: ₹{m.invoice_amount?.toLocaleString('en-IN')} — Diff: ₹{m.difference?.toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
