import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  Divider, Stack, CircularProgress, InputAdornment, IconButton, alpha, Grid
} from '@mui/material';
import { Visibility, VisibilityOff, Shield, Login as LoginIcon } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const DEMO_ACCOUNTS = [
  { role: 'Citizen',    roleKn: 'ನಾಗರಿಕ',        email: 'citizen1@gmail.com',       password: 'citizen123',    color: '#10B981', desc: 'Apply, track & query projects' },
  { role: 'Officer',    roleKn: 'ಅಧಿಕಾರಿ',         email: 'officer1@prajakeeya.gov',  password: 'officer123',    color: '#0891B2', desc: 'Approve files & manage welfare' },
  { role: 'Admin',      roleKn: 'ನಿರ್ವಾಹಕ',         email: 'admin@prajakeeya.gov',     password: 'admin123',      color: GOLD,      desc: 'Full system access & tenders' },
  { role: 'Auditor',    roleKn: 'ಲೆಕ್ಕ ಪರಿಶೀಲಕ',    email: 'auditor@prajakeeya.gov',   password: 'auditor123',    color: '#8B5CF6', desc: 'Analytics, ledger & fraud' },
  { role: 'Contractor', roleKn: 'ಗುತ್ತಿಗೆದಾರ',       email: 'contractor1@gmail.com',    password: 'contractor123', color: '#EF4444', desc: 'Bid on tenders & manage projects' },
];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused fieldset': { borderColor: GOLD },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: GOLD },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(email, password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Login failed. Check your credentials.'); }
    finally { setLoading(false); }
  };

  const quickLogin = async (acc) => {
    setLoading(true); setError('');
    try { await login(acc.email, acc.password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Quick login failed'); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${NAVY} 0%, #1E3A5F 50%, #0D2B45 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      px: 2, py: 4,
    }}>
      <Box sx={{ position: 'fixed', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <Box sx={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 3, background: `linear-gradient(135deg, ${GOLD}, #D97706)`, mb: 2, boxShadow: `0 8px 32px rgba(245,158,11,0.4)` }}>
            <Shield sx={{ color: NAVY, fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, letterSpacing: '-0.02em' }}>Prajakeeya</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>ಪ್ರಜಾಕೀಯ · Zero-Corruption Digital Governance</Typography>
        </Box>

        <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 3 }}>Sign in to your account</Typography>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required fullWidth sx={inputSx} />
                <TextField label="Password" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required fullWidth sx={inputSx}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPwd(!showPwd)} sx={{ color: 'rgba(255,255,255,0.4)' }}>{showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                  sx={{ background: `linear-gradient(135deg, ${GOLD}, #D97706)`, color: NAVY, fontWeight: 700, py: 1.5, fontSize: 15 }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Quick Demo Access</Typography>
            </Divider>

            <Grid container spacing={1}>
              {DEMO_ACCOUNTS.map(acc => (
                <Grid item xs={12} key={acc.role}>
                  <Button onClick={() => quickLogin(acc)} disabled={loading} fullWidth variant="outlined"
                    sx={{ borderColor: alpha(acc.color, 0.3), justifyContent: 'flex-start', px: 2, py: 1, borderRadius: 2, textAlign: 'left',
                      '&:hover': { borderColor: acc.color, bgcolor: alpha(acc.color, 0.08) } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: acc.color, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: acc.color, lineHeight: 1.2 }}>
                          {acc.role} · {acc.roleKn}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5, display: 'block' }}>
                          {acc.desc}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, flexShrink: 0 }}>
                        {acc.email}
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                New citizen?{' '}
                <Link to="/register" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.25)' }}>
          Secured by SHA-256 blockchain · Government of Karnataka
        </Typography>
      </Box>
    </Box>
  );
}
