import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Avatar, alpha
} from '@mui/material';
import { Group, Add, CheckCircle, Warning, Block, Send } from '@mui/icons-material';
import { getBeneficiaries, addBeneficiary, verifyBeneficiary, transferBeneficiary } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';

const STATUS_COLORS = {
  pending: { color: '#D97706', bg: '#FEF3C7' },
  verified: { color: '#0891B2', bg: '#E0F2FE' },
  approved: { color: '#059669', bg: '#D1FAE5' },
  rejected: { color: '#DC2626', bg: '#FEE2E2' },
  duplicate: { color: '#DC2626', bg: '#FEE2E2' },
};

export default function Beneficiaries() {
  const { user } = useAuth();
  const [bens, setBens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ name: '', aadhaar_id: '', scheme: '', amount: '', bank_account: '' });

  const load = () => {
    setLoading(true);
    getBeneficiaries().then(r => setBens(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await addBeneficiary({ ...form, amount: parseFloat(form.amount) });
      setMsg({ type: 'success', text: 'Beneficiary added and verified successfully' });
      setOpen(false);
      setForm({ name: '', aadhaar_id: '', scheme: '', amount: '', bank_account: '' });
      load();
    } catch (err) {
      const e = err.response?.data;
      if (e?.duplicate) {
        setMsg({ type: 'error', text: `🚨 FRAUD BLOCKED: ${e.error} — Aadhaar ${e.existing?.aadhaar_id} already enrolled in ${e.existing?.scheme}.` });
        setOpen(false);
      } else {
        setMsg({ type: 'error', text: e?.error || 'Failed to add beneficiary' });
      }
      load();
    } finally { setSubmitting(false); }
  };

  const handleVerify = async (id) => {
    try { await verifyBeneficiary(id); load(); }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Verification failed' }); }
  };

  const handleTransfer = async (id) => {
    try { await transferBeneficiary(id); setMsg({ type: 'success', text: 'DBT transfer released' }); load(); }
    catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Transfer failed' }); }
  };

  const duplicates = bens.filter(b => b.status === 'duplicate').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Beneficiary Management</Typography>
          <Typography variant="body2" color="text.secondary">
            ಫಲಾನುಭವಿ ನಿರ್ವಹಣೆ · Aadhaar-deduplicated DBT management
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}
          sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
          Add Beneficiary
        </Button>
      </Box>

      {msg && <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {duplicates > 0 && (
        <Alert severity="error" icon={<Block />} sx={{ mb: 3 }}>
          <strong>{duplicates} ghost beneficiary attempt(s) detected and blocked!</strong> Aadhaar deduplication prevented fraudulent enrollment.
        </Alert>
      )}

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
        {[
          { label: 'Total', value: bens.length, color: NAVY },
          { label: 'Verified', value: bens.filter(b => b.status === 'verified').length, color: '#0891B2' },
          { label: 'Approved / Paid', value: bens.filter(b => b.status === 'approved').length, color: '#10B981' },
          { label: 'Duplicates Blocked', value: duplicates, color: '#DC2626' },
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
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Beneficiary</TableCell>
                  <TableCell>Aadhaar</TableCell>
                  <TableCell>Scheme</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bens.map(b => {
                  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                  return (
                    <TableRow key={b.id} sx={b.status === 'duplicate' ? { bgcolor: '#FFF5F5' } : {}}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#0891B2', 0.1), color: '#0891B2', fontSize: 13 }}>
                            {b.name?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.name}</Typography>
                            {b.bank_account && <Typography variant="caption" color="text.secondary">A/C: {b.bank_account}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.aadhaar_id}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{b.scheme}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{b.amount?.toLocaleString('en-IN')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label={b.status} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                          {b.status === 'duplicate' && <Block sx={{ fontSize: 16, color: '#DC2626' }} />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {b.status === 'pending' && (
                            <Button size="small" variant="contained" color="info"
                              onClick={() => handleVerify(b.id)} sx={{ fontSize: 11, py: 0.5 }}>
                              Verify
                            </Button>
                          )}
                          {b.status === 'verified' && (
                            <Button size="small" variant="contained" color="success"
                              onClick={() => handleTransfer(b.id)} sx={{ fontSize: 11, py: 0.5 }}>
                              Release DBT
                            </Button>
                          )}
                          {b.status === 'duplicate' && (
                            <Chip label="BLOCKED" size="small" color="error" variant="outlined" />
                          )}
                          {b.transfer_ref && (
                            <Typography variant="caption" sx={{ color: '#10B981', fontFamily: 'monospace' }}>
                              {b.transfer_ref}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Beneficiary · ಫಲಾನುಭವಿ ಸೇರಿಸಿ</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Aadhaar will be checked for duplicates across all schemes. Ghost beneficiaries are automatically blocked.
          </Alert>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Full Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            <TextField label="Aadhaar Number *" value={form.aadhaar_id}
              onChange={e => setForm(p => ({ ...p, aadhaar_id: e.target.value }))}
              placeholder="e.g., 1234-5678-9012" required />
            <TextField label="Scheme Name *" value={form.scheme}
              onChange={e => setForm(p => ({ ...p, scheme: e.target.value }))}
              placeholder="e.g., PM Kisan Samman Nidhi" required />
            <TextField label="Amount (₹) *" type="number" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            <TextField label="Bank Account Number" value={form.bank_account}
              onChange={e => setForm(p => ({ ...p, bank_account: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            disabled={submitting || !form.name || !form.aadhaar_id || !form.scheme || !form.amount}
            startIcon={submitting ? <CircularProgress size={16} /> : <Send />}
            sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
            {submitting ? 'Checking...' : 'Add & Verify'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
