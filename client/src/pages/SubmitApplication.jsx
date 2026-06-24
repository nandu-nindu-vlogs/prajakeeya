import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Select,
  MenuItem, FormControl, InputLabel, Alert, Stack, CircularProgress,
  Stepper, Step, StepLabel, alpha
} from '@mui/material';
import { Send, CheckCircle, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { submitFile } from '../api';

const NAVY = '#0D1B2A';
const GOLD = '#F59E0B';

const CATEGORIES = ['Ration Card', 'Income Certificate', 'Pension', 'Housing Scheme', 'Education Grant', 'Health Scheme', 'Land Records', 'Business License', 'Other'];
const DEPT_IDS = [
  { id: 1, name: 'Revenue Department' },
  { id: 2, name: 'Health Department' },
  { id: 3, name: 'Education Department' },
  { id: 4, name: 'Public Works Department' },
];

export default function SubmitApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '', dept_id: '', priority: 'normal' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await submitFile(form);
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto' }}>
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircle sx={{ fontSize: 64, color: '#10B981', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Application Submitted!</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>{success.title}</Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: '#F8FAFC', px: 2, py: 1, borderRadius: 1, display: 'inline-block', mb: 3 }}>
            File ID: #{success.id}
          </Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            Your application has been recorded in the immutable ledger and assigned to the concerned department. You will be notified of status updates. SLA: 48 hours.
          </Alert>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" onClick={() => navigate('/files')}
              sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
              Track My Applications
            </Button>
            <Button variant="outlined" onClick={() => { setSuccess(null); setForm({ title: '', description: '', category: '', dept_id: '', priority: 'normal' }); }}>
              Submit Another
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 700, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ mb: 3, color: '#64748B' }}>
        Back
      </Button>
      <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}>Submit Application</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ಅರ್ಜಿ ಸಲ್ಲಿಸಿ · Your submission is recorded in an immutable ledger
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField label="Application Title *" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                placeholder="E.g., Income Certificate for Bank Loan" />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Category *</InputLabel>
                  <Select label="Category *" value={form.category} required
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select label="Department" value={form.dept_id}
                    onChange={e => setForm(p => ({ ...p, dept_id: e.target.value }))}>
                    {DEPT_IDS.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <TextField label="Description" multiline rows={4} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Provide complete details about your application — supporting documents, reference numbers, specific requirements..." />
              <FormControl>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={form.priority}
                  onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {['low','normal','high','urgent'].map(p => <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <Alert severity="info">
                Your application will be assigned a unique file ID and recorded in the blockchain ledger. Response time: within 48 hours (SLA enforced).
              </Alert>
              <Button type="submit" variant="contained" size="large" disabled={loading || !form.title || !form.category}
                startIcon={loading ? <CircularProgress size={18} /> : <Send />}
                sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)`, py: 1.5 }}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
