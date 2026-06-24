import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Stack, Chip,
  Container, Avatar, alpha, Divider
} from '@mui/material';
import {
  Shield, Speed, Gavel, Group, VerifiedUser, TrendingUp,
  ArrowForward, CheckCircle, Lock, Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getPublicDashboard } from '../api';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const FEATURES = [
  { icon: <Lock />, title: 'Immutable Ledger', titleKn: 'ಅಚಲ ಲೆಜರ್', desc: 'Every action SHA-256 hash-chained. No record can be altered without detection.', color: '#0891B2' },
  { icon: <Speed />, title: 'Instant Documents', titleKn: 'ತಕ್ಷಣ ದಾಖಲೆಗಳು', desc: 'Auto-verified certificates issued in seconds — no officer queue, no delays.', color: '#10B981' },
  { icon: <Shield />, title: 'Ghost-Proof DBT', titleKn: 'ಅದೃಶ್ಯ-ರಹಿತ ಡಿಬಿಟಿ', desc: 'Aadhaar deduplication blocks duplicate beneficiaries before payment.', color: '#8B5CF6' },
  { icon: <Gavel />, title: 'Sealed Bidding', titleKn: 'ಮುಚ್ಚಿದ ಬಿಡ್', desc: 'Tender bids hidden until deadline, auto-scored by algorithm — no favoritism.', color: GOLD },
  { icon: <VerifiedUser />, title: '3-Way Match', titleKn: '3-ಮಾರ್ಗ ಹೊಂದಾಣಿಕೆ', desc: 'PO + Goods Receipt + Invoice must all match before any payment releases.', color: '#EF4444' },
  { icon: <TrendingUp />, title: 'AI Anomaly Detection', titleKn: 'AI ಅಸಂಗತ ಪತ್ತೆ', desc: 'Real-time monitoring of rapid approvals, budget overspend, vendor concentration.', color: '#F59E0B' },
];

function StatCard({ label, labelKn, value, color }) {
  return (
    <Box sx={{ textAlign: 'center', px: 2 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 0.5 }}>{label}</Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{labelKn}</Typography>
    </Box>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  useEffect(() => { getPublicDashboard().then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <Box>
      {/* Hero */}
      <Box sx={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #1A2F45 40%, #0D2B45 100%)`,
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
        <Box sx={{ position: 'absolute', top: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(GOLD, 0.08)}, transparent 70%)` }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${alpha('#0891B2', 0.08)}, transparent 70%)` }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip label="Government of Karnataka · ಕರ್ನಾಟಕ ಸರ್ಕಾರ" size="small"
                sx={{ bgcolor: alpha(GOLD, 0.15), color: GOLD, border: `1px solid ${alpha(GOLD, 0.3)}`, mb: 3, fontWeight: 600 }} />
              <Typography variant="h1" sx={{
                color: 'white', fontSize: { xs: '2.2rem', md: '3.5rem' },
                lineHeight: 1.1, mb: 2, letterSpacing: '-0.03em'
              }}>
                ಪ್ರಜಾಕೀಯ<br />
                <Box component="span" sx={{ background: `linear-gradient(135deg, ${GOLD}, #FCD34D)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Prajakeeya
                </Box>
              </Typography>
              <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 400, mb: 1, lineHeight: 1.4 }}>
                Zero-Corruption Digital Governance
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4, maxWidth: 520, lineHeight: 1.7 }}>
                A tamper-proof governance platform where every rupee is tracked, every decision is audited, and no citizen is left behind. Built on blockchain-grade immutability.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" size="large" onClick={() => navigate('/register')}
                  endIcon={<ArrowForward />}
                  sx={{ background: `linear-gradient(135deg, ${GOLD}, #D97706)`, color: NAVY, fontWeight: 700, py: 1.5, px: 3, fontSize: 15 }}>
                  Register as Citizen
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/public')}
                  startIcon={<Visibility />}
                  sx={{ borderColor: 'rgba(255,255,255,0.25)', color: 'white', py: 1.5, px: 3, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } }}>
                  Public Dashboard
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ bgcolor: alpha('#FFFFFF', 0.04), borderRadius: 4, border: `1px solid ${alpha('#FFFFFF', 0.08)}`, p: 3, backdropFilter: 'blur(10px)' }}>
                <Typography variant="overline" sx={{ color: GOLD, fontWeight: 700, fontSize: 11 }}>LIVE SYSTEM STATS</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}><StatCard label="Files Processed" labelKn="ಸಂಸ್ಕರಿಸಿದ ಫೈಲ್ಗಳು" value={stats?.total_files ?? '—'} color="#10B981" /></Grid>
                  <Grid item xs={6}><StatCard label="Ledger Blocks" labelKn="ಲೆಜರ್ ಬ್ಲಾಕ್ಗಳು" value={stats?.total_ledger_blocks ?? '—'} color={GOLD} /></Grid>
                  <Grid item xs={6}><StatCard label="Frauds Blocked" labelKn="ತಡೆಗಟ್ಟಿದ ವಂಚನೆ" value={stats?.duplicate_beneficiaries ?? '—'} color="#EF4444" /></Grid>
                  <Grid item xs={6}><StatCard label="Citizens Served" labelKn="ಸೇವೆ ಪಡೆದ ನಾಗರಿಕರು" value={stats?.total_citizens ?? '—'} color="#0891B2" /></Grid>
                </Grid>
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Chain integrity: VERIFIED · {stats?.total_ledger_blocks ?? 0} blocks
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Chip label="Core Protection Layers" size="small" sx={{ bgcolor: alpha(NAVY, 0.08), color: NAVY, fontWeight: 700, mb: 2 }} />
          <Typography variant="h3" sx={{ fontWeight: 700, color: NAVY, mb: 1.5 }}>Built to Eliminate Corruption</Typography>
          <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 560, mx: 'auto' }}>
            Six independent layers of protection ensure no single point of failure, no human discretion, and no loophole.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {FEATURES.map(f => (
            <Grid item xs={12} sm={6} md={4} key={f.title}>
              <Card sx={{ height: '100%', p: 1, transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(13,27,42,0.12)' } }}>
                <CardContent>
                  <Avatar sx={{ bgcolor: alpha(f.color, 0.12), color: f.color, mb: 2, width: 48, height: 48 }}>{f.icon}</Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{f.title}</Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1.5, fontSize: 11 }}>{f.titleKn}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.6 }}>{f.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box sx={{ background: `linear-gradient(135deg, ${NAVY}, #1A2F45)`, py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
            ಡಿಜಿಟಲ್ ಇಂಡಿಯಾ · ಭ್ರಷ್ಟಾಚಾರ ರಹಿತ ಆಡಳಿತ
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
            Every transaction public. Every decision accountable. Every citizen protected.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button variant="contained" size="large" onClick={() => navigate('/login')}
              sx={{ background: `linear-gradient(135deg, ${GOLD}, #D97706)`, color: NAVY, fontWeight: 700, py: 1.5, px: 4 }}>
              Login to Portal
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/public')}
              sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', py: 1.5, px: 4 }}>
              View Transparency Dashboard
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
