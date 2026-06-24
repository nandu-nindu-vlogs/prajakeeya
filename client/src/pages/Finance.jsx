import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Tabs, Tab, LinearProgress, alpha, Divider
} from '@mui/material';
import {
  AccountBalance, Add, CheckCircle, LocalShipping, Receipt,
  VerifiedUser, Warning, TrendingUp
} from '@mui/icons-material';
import { getPOs, createPO, submitGR, submitInvoice, getBudget } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const PO_STEP_COLORS = {
  created: { label: 'PO Created', color: '#0891B2', bg: '#E0F2FE' },
  gr_submitted: { label: 'GR Received', color: '#D97706', bg: '#FEF3C7' },
  invoice_submitted: { label: 'Invoice Submitted', color: '#7C3AED', bg: '#EDE9FE' },
  matched: { label: '3-Way Matched ✓', color: '#059669', bg: '#D1FAE5' },
  paid: { label: 'Payment Released', color: '#10B981', bg: '#ECFDF5' },
  mismatch: { label: '⚠ Mismatch', color: '#DC2626', bg: '#FEE2E2' },
};

function MatchStep({ label, done, active }) {
  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '50%', mx: 'auto', mb: 0.5,
        bgcolor: done ? '#10B981' : active ? GOLD : '#E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s',
      }}>
        {done ? <CheckCircle sx={{ color: 'white', fontSize: 18 }} /> :
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: active ? NAVY : '#94A3B8' }} />}
      </Box>
      <Typography variant="caption" sx={{ color: done ? '#10B981' : active ? NAVY : '#94A3B8', fontWeight: done ? 700 : 500, fontSize: 10 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function Finance() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [pos, setPOs] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [grDialog, setGrDialog] = useState(null);
  const [invoiceDialog, setInvoiceDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ vendor: '', description: '', amount: '', department: '' });
  const [grQty, setGrQty] = useState('');
  const [invAmt, setInvAmt] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getPOs(), getBudget()])
      .then(([r1, r2]) => { setPOs(r1.data); setBudget(r2.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createPO({ ...form, amount: parseFloat(form.amount) });
      setMsg({ type: 'success', text: 'Purchase Order created and logged to immutable ledger' });
      setOpen(false);
      setForm({ vendor: '', description: '', amount: '', department: '' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create PO' });
    } finally { setSubmitting(false); }
  };

  const handleGR = async () => {
    setSubmitting(true);
    try {
      await submitGR(grDialog.id, { quantity_received: parseInt(grQty) });
      setMsg({ type: 'success', text: 'Goods Receipt recorded' });
      setGrDialog(null); setGrQty(''); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'GR failed' });
    } finally { setSubmitting(false); }
  };

  const handleInvoice = async () => {
    setSubmitting(true);
    try {
      const res = await submitInvoice(invoiceDialog.id, { invoice_amount: parseFloat(invAmt) });
      const r = res.data;
      if (r.match_status === 'matched') {
        setMsg({ type: 'success', text: `✅ 3-Way Match SUCCESSFUL — Payment of ₹${parseFloat(invAmt).toLocaleString('en-IN')} auto-released` });
      } else {
        setMsg({ type: 'warning', text: `⚠ 3-Way Match FAILED — ${r.reason}. Payment blocked.` });
      }
      setInvoiceDialog(null); setInvAmt(''); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Invoice submission failed' });
    } finally { setSubmitting(false); }
  };

  const getStep = (po) => {
    if (po.status === 'paid') return 4;
    if (po.status === 'matched') return 3;
    if (po.status === 'invoice_submitted') return 2;
    if (po.status === 'gr_submitted') return 1;
    return 0;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Financial Management</Typography>
          <Typography variant="body2" color="text.secondary">
            ಹಣಕಾಸು ನಿರ್ವಹಣೆ · 3-Way Match · PO → GR → Invoice verification
          </Typography>
        </Box>
        {user?.role !== 'auditor' && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}
            sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
            Create Purchase Order
          </Button>
        )}
      </Box>

      {msg && <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Purchase Orders" />
        <Tab label="Budget Utilisation" />
      </Tabs>

      {tab === 0 && (
        loading ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box> : (
          <Stack spacing={2}>
            {pos.length === 0 && (
              <Card><CardContent><Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No purchase orders yet</Typography></CardContent></Card>
            )}
            {pos.map(po => {
              const sc = PO_STEP_COLORS[po.status] || PO_STEP_COLORS.created;
              const step = getStep(po);
              return (
                <Card key={po.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{po.description}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          PO-{String(po.id).padStart(4, '0')} · {po.vendor} · {po.department}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>
                          ₹{po.amount?.toLocaleString('en-IN')}
                        </Typography>
                        <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                      </Box>
                    </Box>

                    {/* 3-way match progress */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mb: 2, position: 'relative' }}>
                      {['Purchase Order', 'Goods Receipt', 'Invoice', 'Matched', 'Paid'].map((s, i) => (
                        <React.Fragment key={s}>
                          <MatchStep label={s} done={step > i} active={step === i} />
                          {i < 4 && (
                            <Box sx={{ flex: 0, width: 24, height: 2, bgcolor: step > i ? '#10B981' : '#E2E8F0', mt: -2.5 }} />
                          )}
                        </React.Fragment>
                      ))}
                    </Box>

                    {po.match_status === 'mismatch' && po.mismatch_reason && (
                      <Alert severity="error" sx={{ mb: 2 }} icon={<Warning />}>
                        <strong>Mismatch:</strong> {po.mismatch_reason}
                      </Alert>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {po.status === 'created' && user?.role !== 'auditor' && (
                        <Button size="small" variant="outlined" startIcon={<LocalShipping />}
                          onClick={() => setGrDialog(po)}>
                          Record GR
                        </Button>
                      )}
                      {po.status === 'gr_submitted' && user?.role !== 'auditor' && (
                        <Button size="small" variant="outlined" startIcon={<Receipt />}
                          onClick={() => setInvoiceDialog(po)}>
                          Submit Invoice
                        </Button>
                      )}
                      {po.status === 'matched' && (
                        <Chip label="✓ Payment Auto-Released" color="success" size="small" />
                      )}
                      {po.paid_at && (
                        <Typography variant="caption" color="text.secondary">
                          Paid: {new Date(po.paid_at).toLocaleDateString('en-IN')}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )
      )}

      {tab === 1 && budget && (
        <Stack spacing={2}>
          {budget.departments?.map(dept => {
            const pct = Math.min(100, Math.round((dept.utilized / dept.allocated) * 100));
            const color = pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#10B981';
            return (
              <Card key={dept.name}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{dept.name}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ₹{dept.utilized?.toLocaleString('en-IN')} / ₹{dept.allocated?.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption" sx={{ color }}>{pct}% utilized</Typography>
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={pct}
                    sx={{ '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                </CardContent>
              </Card>
            );
          })}
          {!budget.departments?.length && (
            <Card><CardContent>
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No budget data yet — create purchase orders to see utilization</Typography>
            </CardContent></Card>
          )}
        </Stack>
      )}

      {/* Create PO dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Every PO is logged to the immutable hash chain. 3-Way match (PO+GR+Invoice) is enforced before payment.
          </Alert>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Vendor Name *" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} required />
            <TextField label="Description *" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
            <TextField label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            <TextField label="Department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={submitting || !form.vendor || !form.description || !form.amount}
            startIcon={submitting ? <CircularProgress size={16} /> : <AccountBalance />}
            sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
            {submitting ? 'Creating...' : 'Create PO'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GR dialog */}
      <Dialog open={!!grDialog} onClose={() => setGrDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Goods Receipt</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            PO: {grDialog?.description} · ₹{grDialog?.amount?.toLocaleString('en-IN')}
          </Typography>
          <TextField fullWidth label="Quantity Received *" type="number" value={grQty}
            onChange={e => setGrQty(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setGrDialog(null)}>Cancel</Button>
          <Button variant="contained" color="info" onClick={handleGR}
            disabled={submitting || !grQty}
            startIcon={submitting ? <CircularProgress size={16} /> : <LocalShipping />}>
            Record GR
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice dialog */}
      <Dialog open={!!invoiceDialog} onClose={() => setInvoiceDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Submit Invoice</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            PO amount: ₹{invoiceDialog?.amount?.toLocaleString('en-IN')} — Invoice amount must match PO for 3-way match to pass.
          </Typography>
          <TextField fullWidth label="Invoice Amount (₹) *" type="number" value={invAmt}
            onChange={e => setInvAmt(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setInvoiceDialog(null)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleInvoice}
            disabled={submitting || !invAmt}
            startIcon={submitting ? <CircularProgress size={16} /> : <Receipt />}>
            Submit &amp; Match
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
