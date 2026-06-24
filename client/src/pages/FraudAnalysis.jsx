import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Stack, Avatar,
  Alert, CircularProgress, alpha, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Warning, Block, Shield, AccountBalance, Person, ReceiptLong, Gavel, CheckCircle } from '@mui/icons-material';
import { getFraudAnalytics, getAnalyticsOverview } from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';
const RED  = '#EF4444';
const PIE_COLORS = ['#EF4444','#F59E0B','#0891B2','#10B981','#8B5CF6','#64748B','#EC4899','#06B6D4'];

function StatCard({ label, value, sublabel, color, icon }) {
  return (
    <Card sx={{ border:`1px solid ${alpha(color,0.2)}`, bgcolor:alpha(color,0.03) }}>
      <CardContent sx={{ p:2.5 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight:800, color }}>{value ?? '—'}</Typography>
            <Typography variant="body2" sx={{ fontWeight:600, color:'#374151', mt:0.5 }}>{label}</Typography>
            {sublabel && <Typography variant="caption" color="text.secondary">{sublabel}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor:alpha(color,0.15), color, width:44, height:44 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function FraudAnalysis() {
  const [fraud, setFraud] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFraudAnalytics(), getAnalyticsOverview()])
      .then(([f, o]) => { setFraud(f.data); setOverview(o.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', py:10 }}><CircularProgress /></Box>;

  const k               = overview?.kpis || {};
  const duplicates      = fraud?.duplicateBeneficiaries || [];
  const mismatches      = fraud?.invoiceMismatches || [];
  const concentration   = fraud?.vendorConcentration || [];
  const rapidApprovals  = fraud?.rapidApprovals || [];
  const allAlerts       = fraud?.allAlerts || [];
  const corruptionCount = fraud?.corruptionCount ?? 0;

  return (
    <Box sx={{ p:{ xs:2, md:3 }, maxWidth:1200, mx:'auto' }}>
      <Box sx={{ mb:3 }}>
        <Typography variant="h5" sx={{ fontWeight:700, color:NAVY }}>Fraud & Anomaly Detection</Typography>
        <Typography variant="body2" color="text.secondary">
          ಅಕ್ರಮ ಮತ್ತು ವ್ಯತ್ಯಾಸ ಪರಿಶೋಧನೆ · AI-powered real-time corruption monitoring
        </Typography>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2.5} sx={{ mb:3 }}>
        <Grid item xs={6} sm={3}><StatCard label="Frauds Blocked"        value={k.duplicatesBlocked}  color={RED}       icon={<Block />}        sublabel="Duplicate Aadhaar" /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Invoice Mismatches"    value={mismatches.length}    color="#D97706"   icon={<ReceiptLong />}  sublabel="Payment blocked" /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Open Alerts"           value={allAlerts.length}     color={GOLD}      icon={<Warning />}      sublabel="Require action" /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="Corruption Complaints" value={corruptionCount}      color="#8B5CF6"   icon={<Gavel />}        sublabel="Under investigation" /></Grid>
      </Grid>

      <Alert severity="success" icon={<Shield />} sx={{ mb:3 }}>
        <strong>System Shield Active:</strong> All transactions protected by 4 layers — Aadhaar deduplication, 3-Way Financial Match, Sealed-bid procurement, and Immutable blockchain ledger.
      </Alert>

      <Grid container spacing={3}>
        {/* Ghost Beneficiary Blocks */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p:3 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
                <Block sx={{ color:RED }} />
                <Typography variant="h6" sx={{ fontWeight:700 }}>Ghost Beneficiary Blocks</Typography>
                <Chip label={`${duplicates.length} blocked`} size="small"
                  sx={{ bgcolor:alpha(RED,0.1), color:RED, fontWeight:700, ml:'auto' }} />
              </Box>
              {duplicates.length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>No duplicate Aadhaar detected.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor:'#FEF2F2' }}>
                      <TableRow>
                        {['Name','Aadhaar','Scheme','Amount'].map(h => (
                          <TableCell key={h} sx={{ fontWeight:700, fontSize:12 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {duplicates.map(d => (
                        <TableRow key={d.id} sx={{ bgcolor: alpha(RED,0.02) }}>
                          <TableCell><Typography variant="caption" sx={{ fontWeight:600 }}>{d.name}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ fontFamily:'monospace', color:RED }}>{d.aadhaar_id}</Typography></TableCell>
                          <TableCell><Typography variant="caption">{d.scheme}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ fontWeight:700 }}>₹{d.amount?.toLocaleString('en-IN')}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Mismatches */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p:3 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
                <ReceiptLong sx={{ color:'#D97706' }} />
                <Typography variant="h6" sx={{ fontWeight:700 }}>3-Way Match Failures</Typography>
                <Chip label="Payment Blocked" size="small"
                  sx={{ bgcolor:alpha('#D97706',0.1), color:'#D97706', fontWeight:700, ml:'auto' }} />
              </Box>
              {mismatches.length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>All invoices matched successfully.</Alert>
              ) : (
                <Stack spacing={2}>
                  {mismatches.map(m => (
                    <Paper key={m.id} variant="outlined" sx={{ p:2, borderRadius:2, borderColor:alpha('#D97706',0.3), bgcolor:alpha('#D97706',0.03) }}>
                      <Typography variant="caption" sx={{ fontWeight:700, color:'#D97706', display:'block' }}>
                        PO #{m.id} — {m.vendor_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{m.dept_name}</Typography>
                      <Grid container spacing={1} sx={{ mt:0.5 }}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">PO Amount</Typography>
                          <Typography variant="body2" sx={{ fontWeight:700 }}>₹{m.po_amount?.toLocaleString('en-IN')}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Invoice</Typography>
                          <Typography variant="body2" sx={{ fontWeight:700, color:RED }}>₹{m.invoice_amount?.toLocaleString('en-IN')}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Difference</Typography>
                          <Typography variant="body2" sx={{ fontWeight:700, color:RED }}>₹{m.difference?.toLocaleString('en-IN')}</Typography>
                        </Grid>
                      </Grid>
                      {m.mismatch_reason && (
                        <Typography variant="caption" sx={{ color:RED, display:'block', mt:0.5 }}>{m.mismatch_reason}</Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Vendor Concentration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p:3 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
                <AccountBalance sx={{ color:NAVY }} />
                <Typography variant="h6" sx={{ fontWeight:700 }}>Vendor Concentration Risk</Typography>
              </Box>
              {concentration.length === 0 ? (
                <Alert severity="info">No PO data yet.</Alert>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={concentration} dataKey="total_value" nameKey="vendor_name"
                        cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${(name||'').substring(0,12)} ${(percent*100).toFixed(0)}%`}
                        labelLine={false}>
                        {concentration.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${Number(v)?.toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Stack spacing={1} sx={{ mt:1 }}>
                    {concentration.map((v, i) => (
                      <Box key={v.vendor_name} sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Box sx={{ width:10, height:10, borderRadius:'50%', bgcolor:PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }} />
                        <Typography variant="caption" sx={{ flex:1 }} noWrap>{v.vendor_name}</Typography>
                        <Typography variant="caption" sx={{ fontWeight:700 }}>
                          {v.contracts} POs · ₹{((v.total_value||0)/100000).toFixed(1)}L
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p:3 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
                <Warning sx={{ color:GOLD }} />
                <Typography variant="h6" sx={{ fontWeight:700 }}>Active System Alerts</Typography>
                <Chip label={`${allAlerts.length} unresolved`} size="small"
                  sx={{ bgcolor:alpha(GOLD,0.1), color:'#92400E', fontWeight:700, ml:'auto' }} />
              </Box>
              {allAlerts.length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>All clear — no active alerts.</Alert>
              ) : (
                <Stack spacing={1.5} sx={{ maxHeight:300, overflow:'auto', pr:0.5 }}>
                  {allAlerts.map(a => {
                    const sevColor = { critical:'#EF4444', high:'#EA580C', medium:'#D97706', low:'#2563EB' }[a.severity] || NAVY;
                    return (
                      <Paper key={a.id} variant="outlined" sx={{ p:1.5, borderRadius:2, borderColor:alpha(sevColor,0.3), bgcolor:alpha(sevColor,0.02) }}>
                        <Box sx={{ display:'flex', gap:1, mb:0.5, flexWrap:'wrap' }}>
                          <Chip label={a.severity?.toUpperCase()} size="small"
                            sx={{ bgcolor:alpha(sevColor,0.1), color:sevColor, fontWeight:700, fontSize:10, height:18 }} />
                          <Chip label={a.type?.replace(/_/g,' ').toUpperCase()} size="small"
                            sx={{ bgcolor:alpha(NAVY,0.05), color:NAVY, fontSize:10, height:18 }} />
                        </Box>
                        <Typography variant="caption">{a.message}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:0.25 }}>
                          {new Date(a.created_at).toLocaleDateString('en-IN')}
                        </Typography>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Rapid Approval Anomalies */}
        {rapidApprovals.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p:3 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
                  <Person sx={{ color:'#8B5CF6' }} />
                  <Typography variant="h6" sx={{ fontWeight:700 }}>Rapid Approval Anomalies</Typography>
                  <Chip label="Under Review" size="small" sx={{ bgcolor:alpha('#8B5CF6',0.1), color:'#8B5CF6', ml:'auto' }} />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor:'#F8FAFC' }}>
                      <TableRow>
                        {['Officer','Files Processed','Avg Time (hrs)','Risk Level'].map(h => (
                          <TableCell key={h} sx={{ fontWeight:700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rapidApprovals.map(r => {
                        const risk = r.avg_hours < 0.5 ? 'HIGH' : r.avg_hours < 2 ? 'MEDIUM' : 'LOW';
                        const rColor = risk === 'HIGH' ? RED : risk === 'MEDIUM' ? '#D97706' : '#10B981';
                        return (
                          <TableRow key={r.officer_id} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight:600 }}>{r.officer_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.officer_email}</Typography>
                            </TableCell>
                            <TableCell>{r.file_count}</TableCell>
                            <TableCell sx={{ color: r.avg_hours < 1 ? RED : 'inherit', fontWeight: r.avg_hours < 1 ? 700 : 400 }}>
                              {r.avg_hours?.toFixed(1)}h
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={risk}
                                sx={{ bgcolor:alpha(rColor,0.1), color:rColor, fontWeight:700, fontSize:10 }} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
