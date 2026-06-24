import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Divider, Avatar, alpha
} from '@mui/material';
import {
  ArticleOutlined, Bolt, CheckCircle, Download, Visibility,
  Schedule, Warning, Add
} from '@mui/icons-material';
import { getAvailableDocTypes, generateDocument, getMyDocuments } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const DOC_ICONS = {
  income: '💰', caste: '🏷️', domicile: '🏠', scheme_eligibility: '📋'
};

function CertificateView({ data, meta, cert }) {
  if (!data) return null;
  return (
    <Box sx={{
      border: '3px double #0D1B2A', borderRadius: 2, p: 3,
      background: 'linear-gradient(135deg, #FAFAF8 0%, #F5F3E8 100%)',
      position: 'relative', fontFamily: 'serif',
    }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 2, borderBottom: '2px solid #0D1B2A', pb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>
          🏛️ GOVERNMENT OF KARNATAKA · ಕರ್ನಾಟಕ ಸರ್ಕಾರ
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
          {data.issuing_authority}
        </Typography>
      </Box>
      {/* Title */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
          {meta?.label}
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontFamily: 'sans-serif' }}>
          {meta?.label_kn}
        </Typography>
      </Box>
      {/* Cert body */}
      <Box sx={{ my: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 2, color: '#1E293B', fontFamily: 'serif', fontSize: 13 }}>
          This is to certify that <strong>{data.citizen_name}</strong>
          {data.aadhaar_masked && `, Aadhaar: ${data.aadhaar_masked},`}
          {data.declared_annual_income && ` has an annual income of ₹${data.declared_annual_income}`}
          {data.category && ` belongs to the ${data.category} category`}
          {data.state && ` is a bonafide resident of ${data.state}`}
          {data.scheme_name && ` is ELIGIBLE for ${data.scheme_name}`}
          {' '}as per the official records maintained by this office.
        </Typography>
      </Box>
      {/* Details table */}
      <Box sx={{ bgcolor: 'rgba(13,27,42,0.04)', borderRadius: 1, p: 2, mb: 2, fontFamily: 'sans-serif' }}>
        <Grid container spacing={1}>
          {[
            ['Certificate No.', data.cert_number],
            ['Issued On', new Date(data.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
            ['Valid Until', data.valid_until ? new Date(data.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Permanent'],
            ['Issued By', 'Digital Governance System, Prajakeeya'],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <Grid item xs={5}><Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>{k}</Typography></Grid>
              <Grid item xs={7}><Typography variant="caption" sx={{ color: NAVY, fontWeight: 700 }}>{v}</Typography></Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Box>
      {/* Digital signature */}
      <Box sx={{ borderTop: '1px solid #CBD5E1', pt: 1.5, mt: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: 10, display: 'block' }}>
              Digital Signature: {data.digital_signature}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 10 }}>
              QR: {data.qr_data}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: NAVY, fontWeight: 700, display: 'block', fontSize: 11 }}>
              [DIGITALLY SIGNED]
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>
              Authorized by Prajakeeya System
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const [docTypes, setDocTypes] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dialog, setDialog] = useState(null); // {key, label}
  const [viewDoc, setViewDoc] = useState(null);
  const [msg, setMsg] = useState(null);
  const [formData, setFormData] = useState({});

  const load = () => {
    Promise.all([getAvailableDocTypes(), getMyDocuments()])
      .then(([t, d]) => { setDocTypes(t.data); setMyDocs(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateDocument({ doc_type: dialog.key, ...formData });
      setMsg({ type: 'success', text: `✅ ${res.data.message}` });
      setDialog(null);
      setFormData({});
      load();
    } catch (err) {
      const e = err.response?.data;
      if (e?.existing_cert) {
        setMsg({ type: 'warning', text: `Certificate already active: ${e.existing_cert}. Valid until ${new Date(e.valid_until).toLocaleDateString('en-IN')}` });
        setDialog(null);
      } else {
        setMsg({ type: 'error', text: e?.error || 'Generation failed' });
      }
    } finally { setGenerating(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Bolt sx={{ color: '#10B981', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Instant Document Delivery</Typography>
          <Chip label="NO QUEUE" size="small" sx={{ bgcolor: '#10B981', color: 'white', fontWeight: 800 }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Government certificates issued instantly by the system — no officer approval needed if eligibility criteria are met.
        </Typography>
      </Box>

      {msg && (
        <Alert severity={msg.type} sx={{ mb: 3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>
      )}

      {/* Available types */}
      <Typography variant="overline" sx={{ color: '#64748B', fontWeight: 700, mb: 2, display: 'block' }}>
        AVAILABLE CERTIFICATES
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {docTypes.map(dt => (
          <Grid item xs={12} sm={6} key={dt.key}>
            <Card sx={{
              border: dt.eligible ? `1px solid ${alpha('#10B981', 0.3)}` : '1px solid #E2E8F0',
              transition: 'all 0.2s',
              '&:hover': dt.eligible ? { boxShadow: '0 8px 24px rgba(16,185,129,0.15)', transform: 'translateY(-2px)' } : {}
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 28 }}>{DOC_ICONS[dt.key]}</Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>{dt.label}</Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>{dt.label_kn}</Typography>
                    </Box>
                  </Box>
                  {dt.existing ? (
                    <Chip label="ACTIVE" size="small" sx={{ bgcolor: '#D1FAE5', color: '#059669', fontWeight: 700 }} />
                  ) : dt.eligible ? (
                    <Chip label="ELIGIBLE" size="small" sx={{ bgcolor: '#E0F2FE', color: '#0891B2', fontWeight: 700 }} />
                  ) : (
                    <Chip label="NEEDS AADHAAR" size="small" color="warning" variant="outlined" />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5, lineHeight: 1.6 }}>
                  {dt.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    ⏱️ Valid: {dt.validity_days >= 365 ? `${Math.round(dt.validity_days/365)}yr` : `${dt.validity_days}d`}
                    {dt.requires_aadhaar && ' · Aadhaar required'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {dt.existing && (
                      <Button size="small" startIcon={<Visibility />}
                        onClick={() => setViewDoc(myDocs.find(d => d.doc_type === dt.key))}>
                        View
                      </Button>
                    )}
                    <Button
                      size="small" variant={dt.existing ? 'outlined' : 'contained'}
                      startIcon={dt.existing ? <Add /> : <Bolt />}
                      onClick={() => setDialog(dt)}
                      disabled={!dt.eligible}
                      sx={!dt.existing ? { bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } } : {}}
                    >
                      {dt.existing ? 'Renew' : 'Get Now'}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* My documents */}
      {myDocs.length > 0 && (
        <>
          <Typography variant="overline" sx={{ color: '#64748B', fontWeight: 700, mb: 2, display: 'block' }}>
            MY CERTIFICATES ({myDocs.length})
          </Typography>
          <Stack spacing={2}>
            {myDocs.map(doc => (
              <Card key={doc.id}>
                <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 24 }}>{DOC_ICONS[doc.doc_type]}</Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{doc.meta?.label}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>{doc.cert_number}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                      Issued: {new Date(doc.issued_at).toLocaleDateString('en-IN')}
                    </Typography>
                    {doc.valid_until && (
                      <Typography variant="caption" sx={{ color: doc.is_expired ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                        {doc.is_expired ? 'EXPIRED' : `Valid until ${new Date(doc.valid_until).toLocaleDateString('en-IN')}`}
                      </Typography>
                    )}
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => setViewDoc(doc)}>
                    View Certificate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* Generate dialog */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Bolt sx={{ color: '#10B981' }} />
            Get {dialog?.label}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This certificate will be generated instantly and digitally signed by the Prajakeeya system.
          </Alert>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog?.key === 'income' && (
              <TextField label="Declared Annual Income (₹)" type="number"
                onChange={e => setFormData(p => ({ ...p, declared_income: e.target.value }))}
                helperText="Enter your approximate annual household income" />
            )}
            {dialog?.key === 'caste' && (
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" defaultValue="OBC"
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                  {['SC','ST','OBC','General','EWS'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {dialog?.key === 'scheme_eligibility' && (
              <TextField label="Scheme Name" placeholder="e.g., PM Kisan Samman Nidhi"
                onChange={e => setFormData(p => ({ ...p, scheme_name: e.target.value }))} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerate} disabled={generating}
            startIcon={generating ? <CircularProgress size={16} /> : <Bolt />}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
            {generating ? 'Generating...' : 'Generate Instantly'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View certificate dialog */}
      <Dialog open={!!viewDoc} onClose={() => setViewDoc(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📄 {viewDoc?.meta?.label}</span>
            <Chip label={viewDoc?.cert_number} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewDoc && <CertificateView data={viewDoc.data} meta={viewDoc.meta} cert={viewDoc} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDoc(null)}>Close</Button>
          <Button variant="contained" onClick={() => window.print()} startIcon={<Download />}>
            Print / Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
