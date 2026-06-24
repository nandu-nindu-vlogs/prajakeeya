import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Stack,
  CircularProgress, MenuItem, Select, FormControl, InputLabel, Collapse, alpha
} from '@mui/material';
import { Shield, PersonAdd } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register } from '../api';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: 'white',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
    '&.Mui-focused fieldset': { borderColor: GOLD },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: GOLD },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
};

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', aadhaar_id: '', role: 'citizen',
    company_name: '', contractor_type: 'Civil', license_no: '', gst_no: '', pan_no: '',
    experience_years: '', address: '', specialization: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await register(form);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(user.role === 'contractor' ? '/contractor' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const isContractor = form.role === 'contractor';

  return (
    <Box sx={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${NAVY} 0%, #1E3A5F 50%, #0D2B45 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 4,
    }}>
      <Box sx={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:64, height:64, borderRadius:3, background:`linear-gradient(135deg, ${GOLD}, #D97706)`, mb:2 }}>
            <Shield sx={{ color: NAVY, fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ color:'white', fontWeight:800 }}>Prajakeeya</Typography>
          <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.5)', mt:0.5 }}>Create your account</Typography>
        </Box>

        <Card elevation={0} sx={{ borderRadius:4, border:'1px solid rgba(255,255,255,0.08)', bgcolor:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)' }}>
          <CardContent sx={{ p:4 }}>
            <Typography variant="h6" sx={{ color:'white', fontWeight:700, mb:3 }}>Register</Typography>
            {error && <Alert severity="error" sx={{ mb:3, borderRadius:2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField label="Full Name *" value={form.name} onChange={set('name')} required fullWidth sx={inputSx} />
                <TextField label="Email Address *" type="email" value={form.email} onChange={set('email')} required fullWidth sx={inputSx} />
                <TextField label="Password *" type="password" value={form.password} onChange={set('password')} required fullWidth sx={inputSx} />
                <TextField label="Aadhaar ID (optional)" value={form.aadhaar_id} onChange={set('aadhaar_id')} fullWidth sx={inputSx}
                  placeholder="XXXX-XXXX-XXXX" helperText={<span style={{ color:'rgba(255,255,255,0.35)' }}>Required for scheme benefits</span>} />

                <FormControl fullWidth sx={inputSx}>
                  <InputLabel>Register As</InputLabel>
                  <Select value={form.role} onChange={set('role')} label="Register As"
                    sx={{ color:'white', '& .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.2)' } }}>
                    <MenuItem value="citizen">Citizen (ನಾಗರಿಕ) — Apply for services, track applications</MenuItem>
                    <MenuItem value="contractor">Contractor (ಗುತ್ತಿಗೆದಾರ) — Bid on government tenders</MenuItem>
                  </Select>
                </FormControl>

                {/* Contractor-specific fields */}
                <Collapse in={isContractor}>
                  <Stack spacing={2}>
                    <Alert severity="info" sx={{ fontSize: 12 }}>
                      Contractor accounts require admin verification before bidding on tenders.
                    </Alert>
                    <TextField label="Company Name *" value={form.company_name} onChange={set('company_name')} fullWidth sx={inputSx} required={isContractor} />
                    <FormControl fullWidth sx={inputSx}>
                      <InputLabel>Contractor Type</InputLabel>
                      <Select value={form.contractor_type} onChange={set('contractor_type')} label="Contractor Type"
                        sx={{ color:'white', '& .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.2)' } }}>
                        {['Civil','Electrical','Mechanical','Hydraulic','IT & Technology','General','Environmental'].map(t => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField label="License Number" value={form.license_no} onChange={set('license_no')} fullWidth sx={inputSx} />
                    <TextField label="GST Number" value={form.gst_no} onChange={set('gst_no')} fullWidth sx={inputSx} />
                    <TextField label="PAN Number" value={form.pan_no} onChange={set('pan_no')} fullWidth sx={inputSx} />
                    <TextField label="Experience (Years)" type="number" value={form.experience_years} onChange={set('experience_years')} fullWidth sx={inputSx} />
                    <TextField label="Registered Address" value={form.address} onChange={set('address')} fullWidth sx={inputSx} />
                    <TextField label="Specialization" value={form.specialization} onChange={set('specialization')} fullWidth sx={inputSx}
                      placeholder="e.g., Road Construction, Government Buildings…" />
                  </Stack>
                </Collapse>

                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PersonAdd />}
                  sx={{ background:`linear-gradient(135deg, ${GOLD}, #D97706)`, color:NAVY, fontWeight:700, py:1.5 }}>
                  {loading ? 'Registering…' : isContractor ? 'Register as Contractor' : 'Register as Citizen'}
                </Button>
              </Stack>
            </form>

            <Box sx={{ mt:3, textAlign:'center' }}>
              <Typography variant="body2" sx={{ color:'rgba(255,255,255,0.4)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:GOLD, textDecoration:'none', fontWeight:600 }}>Sign in</Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
