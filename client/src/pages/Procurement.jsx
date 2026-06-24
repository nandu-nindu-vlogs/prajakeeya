import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Collapse, alpha, Divider, LinearProgress, Grid,
  Paper
} from '@mui/material';
import { Gavel, Add, Lock, LockOpen, EmojiEvents, Visibility, Business, Shield } from '@mui/icons-material';
import { getTenders, getTenderDetail, createTender, submitBid, awardTender } from '../api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const STATUS_CFG = {
  open:      { label:'Open for Bids',  color:'#059669', bg:'#D1FAE5', icon:<LockOpen sx={{ fontSize:14 }} /> },
  closed:    { label:'Closed',         color:'#DC2626', bg:'#FEE2E2', icon:<Lock sx={{ fontSize:14 }} />     },
  awarded:   { label:'Awarded',        color:'#7C3AED', bg:'#EDE9FE', icon:<EmojiEvents sx={{ fontSize:14 }} /> },
  cancelled: { label:'Cancelled',      color:'#94A3B8', bg:'#F1F5F9', icon:null },
};

function TenderCard({ tender, onBid, onAward, userRole }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail]     = useState(null);
  const sc       = STATUS_CFG[tender.status] || STATUS_CFG.open;
  const deadline = new Date(tender.deadline);
  const expired  = deadline < new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / 86400000));

  const loadDetail = async () => {
    if (!detail) {
      const r = await getTenderDetail(tender.id);
      setDetail(r.data);
    }
    setExpanded(v => !v);
  };

  const canBid   = userRole === 'contractor' && tender.status === 'open' && !expired;
  const canAward = userRole === 'admin' && tender.status === 'open' && expired;
  const canCreate = userRole === 'admin';

  return (
    <Card sx={{ border: tender.status === 'awarded' ? `1px solid ${alpha('#7C3AED',0.3)}` : '1px solid #E2E8F0' }}>
      <CardContent sx={{ p:3 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:2 }}>
          <Box sx={{ flex:1 }}>
            <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:0.5, flexWrap:'wrap' }}>
              <Chip label={sc.label} size="small" icon={sc.icon} sx={{ bgcolor:sc.bg, color:sc.color, fontWeight:700 }} />
              <Chip label={tender.category || 'General'} size="small" variant="outlined" sx={{ color:'#64748B' }} />
              <Chip label={tender.dept_name} size="small" sx={{ bgcolor:alpha(NAVY,0.05), color:NAVY, fontSize:10 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight:700, mt:0.5 }}>{tender.title}</Typography>
            <Grid container spacing={2} sx={{ mt:0.5 }}>
              <Grid item xs="auto">
                <Typography variant="caption" color="text.secondary">Budget</Typography>
                <Typography variant="body2" sx={{ fontWeight:700 }}>₹{tender.budget?.toLocaleString('en-IN')}</Typography>
              </Grid>
              <Grid item xs="auto">
                <Typography variant="caption" color="text.secondary">Sealed Bids</Typography>
                <Typography variant="body2" sx={{ fontWeight:700 }}>
                  <Lock sx={{ fontSize:11, mr:0.3 }} />{tender.bid_count || 0}
                </Typography>
              </Grid>
              <Grid item xs="auto">
                <Typography variant="caption" color="text.secondary">Deadline</Typography>
                <Typography variant="body2" sx={{ fontWeight:700, color: expired ? '#DC2626' : daysLeft<=3 ? '#D97706' : '#374151' }}>
                  {deadline.toLocaleDateString('en-IN')} {!expired && `(${daysLeft}d)`}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Stack direction="row" spacing={1} alignItems="flex-start" flexShrink={0}>
            <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={loadDetail}
              sx={{ borderColor:'#E2E8F0' }}>
              {expanded ? 'Collapse' : 'View Details'}
            </Button>
            {canBid && (
              <Button size="small" variant="contained" startIcon={<Gavel />}
                onClick={() => onBid(tender)} sx={{ bgcolor:NAVY }}>
                Submit Bid
              </Button>
            )}
            {canAward && (
              <Button size="small" variant="contained" startIcon={<EmojiEvents />}
                onClick={() => onAward(tender.id)} sx={{ bgcolor:'#7C3AED' }}>
                Auto-Award
              </Button>
            )}
          </Stack>
        </Box>

        {/* Contractor CTA when not logged in as contractor */}
        {tender.status === 'open' && !expired && userRole !== 'contractor' && userRole !== 'admin' && (
          <Alert severity="info" icon={<Lock fontSize="small" />} sx={{ mt:2, py:0.5, fontSize:12 }}>
            Only registered contractors can submit bids. Log in as a contractor to participate.
          </Alert>
        )}

        <Collapse in={expanded}>
          <Divider sx={{ my:2 }} />
          {!detail ? <CircularProgress size={20} /> : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>{detail.description}</Typography>
              {detail.criteria?.length > 0 && (
                <Box sx={{ mb:2 }}>
                  <Typography variant="caption" sx={{ fontWeight:700, color:NAVY }}>Scoring Criteria:</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt:0.5 }} flexWrap="wrap">
                    {detail.criteria.map(c => (
                      <Chip key={c.name} label={`${c.name}: ${c.weight}%`} size="small"
                        sx={{ bgcolor:alpha(NAVY,0.06), color:NAVY }} />
                    ))}
                  </Stack>
                </Box>
              )}
              {detail.bids?.length > 0 ? (
                <>
                  <Typography variant="subtitle2" sx={{ mb:1, fontWeight:700, display:'flex', alignItems:'center', gap:1 }}>
                    {detail.bids.length} Bid{detail.bids.length !== 1 ? 's' : ''} Submitted
                    {tender.status === 'open' && (
                      <Chip label="Sealed until deadline" size="small"
                        sx={{ bgcolor:'#FEF3C7', color:'#92400E', fontSize:10 }} />
                    )}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor:'#F8FAFC' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight:700 }}>Company</TableCell>
                          <TableCell sx={{ fontWeight:700 }}>Bid Amount</TableCell>
                          <TableCell sx={{ fontWeight:700 }}>Tech Score</TableCell>
                          <TableCell sx={{ fontWeight:700 }}>Composite</TableCell>
                          <TableCell sx={{ fontWeight:700 }}>Submitted</TableCell>
                          {tender.status === 'awarded' && <TableCell sx={{ fontWeight:700 }}>Result</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.bids.map(bid => (
                          <TableRow key={bid.id} sx={ bid.is_winner ? { bgcolor:alpha('#7C3AED',0.05) } : {} } hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight:600 }}>{bid.vendor_name}</Typography>
                              {bid.company_name && bid.company_name !== bid.vendor_name && (
                                <Typography variant="caption" color="text.secondary">{bid.contractor_type}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight:700 }}>
                                {bid.amount != null ? `₹${bid.amount.toLocaleString('en-IN')}` : <Chip label="🔒 Sealed" size="small" sx={{ fontSize:10 }} />}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {bid.technical_score != null ? (
                                <Box sx={{ display:'flex', alignItems:'center', gap:1, minWidth:80 }}>
                                  <LinearProgress variant="determinate" value={bid.technical_score}
                                    sx={{ flex:1, '& .MuiLinearProgress-bar':{ bgcolor:'#0891B2' } }} />
                                  <Typography variant="caption">{bid.technical_score}</Typography>
                                </Box>
                              ) : <Typography variant="caption" color="text.secondary">Sealed</Typography>}
                            </TableCell>
                            <TableCell>
                              {bid.score != null
                                ? <Chip label={bid.score.toFixed(1)} size="small" sx={{ bgcolor: bid.is_winner ? alpha('#7C3AED',0.1) : alpha(NAVY,0.06), color: bid.is_winner ? '#7C3AED' : NAVY, fontWeight:700 }} />
                                : <Typography variant="caption" color="text.secondary">—</Typography>}
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(bid.submitted_at).toLocaleDateString('en-IN')}
                              </Typography>
                            </TableCell>
                            {tender.status === 'awarded' && (
                              <TableCell>
                                {bid.is_winner
                                  ? <Chip label="🏆 Winner" size="small" sx={{ bgcolor:'#EDE9FE', color:'#7C3AED', fontWeight:700 }} />
                                  : <Chip label="Not Selected" size="small" variant="outlined" sx={{ color:'#94A3B8' }} />}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py:2, textAlign:'center' }}>
                  No bids submitted yet
                </Typography>
              )}
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default function Procurement() {
  const { user } = useAuth();
  const [tenders, setTenders]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [bidDialog, setBidDialog]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState(null);
  const [form, setForm] = useState({ title:'', description:'', budget:'', dept_id:'1', category:'', deadline:'' });
  const [bid, setBid]   = useState({ amount:'', technical_score:'', proposal:'' });

  const load = () => {
    setLoading(true);
    getTenders().then(r => setTenders(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createTender({ ...form, budget: parseFloat(form.budget) });
      setMsg({ type:'success', text:'Tender published. Contractor bids are sealed until deadline.' });
      setCreateOpen(false);
      setForm({ title:'', description:'', budget:'', dept_id:'1', category:'', deadline:'' });
      load();
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.error || 'Failed to create tender' });
    } finally { setSubmitting(false); }
  };

  const handleBid = async () => {
    if (!bidDialog) return;
    setSubmitting(true);
    try {
      await submitBid(bidDialog.id, { ...bid, amount:parseFloat(bid.amount), technical_score:parseFloat(bid.technical_score||0) });
      setMsg({ type:'success', text:'Bid sealed! It is encrypted and will only be revealed after the deadline.' });
      setBidDialog(null);
      setBid({ amount:'', technical_score:'', proposal:'' });
      load();
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.error || 'Bid failed' });
    } finally { setSubmitting(false); }
  };

  const handleAward = async (id) => {
    try {
      const r = await awardTender(id);
      setMsg({ type:'success', text:`🏆 Tender awarded to ${r.data.winner?.vendor_name} (composite score: ${r.data.winner?.composite_score?.toFixed(1)})` });
      load();
    } catch (err) {
      setMsg({ type:'error', text: err.response?.data?.error || 'Award failed' });
    }
  };

  return (
    <Box sx={{ p:{ xs:2, md:3 }, maxWidth:1100, mx:'auto' }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3, flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight:700, color:NAVY }}>Government Tenders</Typography>
          <Typography variant="body2" color="text.secondary">
            ಸಾರ್ವಜನಿಕ ಟೆಂಡರ್ · Sealed-bid · Auto-scored · Publicly transparent
          </Typography>
        </Box>
        {user?.role === 'admin' && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)} sx={{ bgcolor:NAVY }}>
            Publish Tender
          </Button>
        )}
      </Box>

      {msg && <Alert severity={msg.type} sx={{ mb:3 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* Stats row */}
      <Grid container spacing={2} sx={{ mb:3 }}>
        {[
          { label:'Total Tenders', value:tenders.length,                                   color:NAVY      },
          { label:'Open for Bids', value:tenders.filter(t=>t.status==='open').length,     color:'#059669' },
          { label:'Awarded',       value:tenders.filter(t=>t.status==='awarded').length,  color:'#7C3AED' },
          { label:'Total Bids',    value:tenders.reduce((s,t)=>s+(t.bid_count||0),0),     color:'#0891B2' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card>
              <CardContent sx={{ p:2, '&:last-child':{pb:2} }}>
                <Typography variant="h5" sx={{ fontWeight:800, color:s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="info" icon={<Shield />} sx={{ mb:3 }}>
        <strong>Anti-Corruption Guarantee:</strong> Bids are cryptographically sealed until the deadline.
        Winner is auto-selected by composite score (Price 40% + Technical 60%). No manual override allowed.
        {user?.role === 'contractor' && <> <strong>You are logged in as a contractor — you can submit bids!</strong></>}
        {!user?.role && <> Register as a contractor to participate in bidding.</>}
      </Alert>

      {loading ? (
        <Box sx={{ textAlign:'center', py:8 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={2}>
          {tenders.length === 0 && (
            <Card><CardContent sx={{ textAlign:'center', py:4 }}>
              <Typography color="text.secondary">No tenders published yet.</Typography>
            </CardContent></Card>
          )}
          {tenders.map(t => (
            <TenderCard key={t.id} tender={t} onBid={setBidDialog} onAward={handleAward} userRole={user?.role} />
          ))}
        </Stack>
      )}

      {/* Create Tender Dialog — admin only */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor:NAVY, color:'#fff' }}>Publish New Tender</DialogTitle>
        <DialogContent sx={{ pt:3 }}>
          <Stack spacing={2}>
            <TextField label="Tender Title *" fullWidth value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} />
            <TextField label="Description *" multiline rows={3} fullWidth value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
            <TextField label="Budget (₹) *" type="number" fullWidth value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} />
            <TextField label="Category" fullWidth value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} placeholder="Road Works, Building, IT, Water Works…" />
            <TextField label="Bid Deadline *" type="date" fullWidth InputLabelProps={{ shrink:true }} value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p:2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting || !form.title || !form.budget || !form.deadline}
            startIcon={submitting ? <CircularProgress size={16}/> : <Gavel />} sx={{ bgcolor:NAVY }}>
            {submitting ? 'Publishing...' : 'Publish Tender'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contractor Bid Dialog */}
      <Dialog open={!!bidDialog} onClose={() => setBidDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor:NAVY, color:'#fff' }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}><Lock /> Submit Sealed Bid</Box>
        </DialogTitle>
        <DialogContent sx={{ pt:3 }}>
          <Alert severity="warning" icon={<Lock />} sx={{ mb:2 }}>
            Your bid is <strong>sealed until {bidDialog && new Date(bidDialog.deadline).toLocaleDateString('en-IN')}</strong>.
            No one can see your amount until the deadline — not even administrators.
          </Alert>
          <Typography variant="body2" sx={{ fontWeight:600, mb:2 }}>
            {bidDialog?.title} · Budget: ₹{bidDialog?.budget?.toLocaleString('en-IN')}
          </Typography>
          <Stack spacing={2.5}>
            <TextField label="Bid Amount (₹) *" type="number" fullWidth value={bid.amount}
              onChange={e=>setBid(p=>({...p,amount:e.target.value}))}
              helperText="Your total bid amount in rupees" />
            <TextField label="Technical Score (0–100)" type="number" fullWidth value={bid.technical_score}
              onChange={e=>setBid(p=>({...p,technical_score:e.target.value}))}
              inputProps={{ min:0, max:100 }}
              helperText="Self-assessed technical capability score (will be verified)" />
            <TextField label="Technical Proposal" multiline rows={4} fullWidth value={bid.proposal}
              onChange={e=>setBid(p=>({...p,proposal:e.target.value}))}
              placeholder="Describe your approach, methodology, team, and timeline…" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p:2 }}>
          <Button onClick={() => setBidDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleBid} disabled={submitting || !bid.amount}
            startIcon={submitting ? <CircularProgress size={16}/> : <Lock />} sx={{ bgcolor:NAVY }}>
            {submitting ? 'Sealing Bid…' : 'Submit Sealed Bid'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
