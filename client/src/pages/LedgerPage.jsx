import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Stack, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, alpha
} from '@mui/material';
import { Security, Verified, Warning } from '@mui/icons-material';
import { getLedger, verifyChain } from '../api';

const NAVY = '#0D1B2A';
const ACTION_COLORS = {
  FILE_SUBMIT: '#0891B2', FILE_APPROVE: '#10B981', FILE_REJECT: '#EF4444',
  FILE_REVIEW: '#D97706', FILE_ESCALATE: '#7C3AED',
  TENDER_CREATE: '#8B5CF6', BID_SUBMIT: '#6366F1', TENDER_AWARD: '#7C3AED',
  BENEFICIARY_ADD: '#0D9488', BENEFICIARY_DUPLICATE_BLOCKED: '#DC2626',
  PO_CREATE: '#D97706', GOODS_RECEIVED: '#0D9488', INVOICE_MATCHED: '#10B981',
  USER_LOGIN: '#94A3B8', USER_REGISTER: '#64748B',
  GRIEVANCE_FILED: '#0891B2', DOCUMENT_GENERATED: '#10B981',
  SYSTEM_INIT: '#CBD5E1',
};

export default function LedgerPage() {
  const [ledger, setLedger] = useState({ rows: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLedger({ page, limit: 25 }).then(r => setLedger(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  const handleVerify = async () => {
    setVerifying(true);
    try { const r = await verifyChain(); setChain(r.data); }
    finally { setVerifying(false); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Security sx={{ color: NAVY, fontSize: 24 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: NAVY }}>Immutable Audit Ledger</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            ಅಚಲ ಲೆಜರ್ · SHA-256 Hash Chain · {ledger.total} blocks total · Every record tamper-proof
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleVerify} disabled={verifying}
          startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <Verified />}
          sx={{ background: `linear-gradient(135deg, ${NAVY}, #1E3A5F)` }}>
          {verifying ? 'Verifying...' : 'Verify Chain Integrity'}
        </Button>
      </Box>

      {chain && (
        <Alert severity={chain.valid ? 'success' : 'error'} icon={chain.valid ? <Verified /> : <Warning />} sx={{ mb: 3 }}>
          {chain.valid
            ? `✅ CHAIN INTACT — ${chain.total_blocks} blocks verified, no tampering detected. ${chain.message}`
            : `🚨 TAMPERING DETECTED — ${chain.message}`}
        </Alert>
      )}

      {/* Hash formula */}
      <Card sx={{ mb: 3, bgcolor: '#0D1B2A', color: 'white' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94A3B8', display: 'block', mb: 0.5 }}>
            HASH FORMULA
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#E2E8F0' }}>
            block_hash = SHA256(
            <span style={{ color: '#F59E0B' }}>prev_hash</span> +
            <span style={{ color: '#60A5FA' }}> timestamp</span> +
            <span style={{ color: '#A78BFA' }}> actor_id</span> +
            <span style={{ color: '#F87171' }}> action</span> +
            <span style={{ color: '#34D399' }}> entity</span> +
            <span style={{ color: '#FB923C' }}> payload</span>) — Any alteration permanently breaks the chain
          </Typography>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Block Hash</TableCell>
                    <TableCell>Prev Hash</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.rows.map(block => {
                    const color = ACTION_COLORS[block.action_type] || '#64748B';
                    return (
                      <TableRow key={block.id} hover>
                        <TableCell><Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>#{block.id}</Typography></TableCell>
                        <TableCell>
                          <Chip label={block.action_type.replace(/_/g,' ')} size="small"
                            sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 700, fontSize: 10 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>{block.actor_name || block.actor_email || 'System'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {block.entity_type} {block.entity_id ? `#${block.entity_id}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(block.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#0D9488', fontSize: 10 }}>
                            {block.block_hash?.slice(0, 16)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#94A3B8', fontSize: 10 }}>
                            {block.prev_hash?.slice(0, 12)}...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Page {ledger.page} of {ledger.pages} · {ledger.total} blocks
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</Button>
              <Button size="small" variant="outlined" onClick={() => setPage(p => Math.min(ledger.pages, p+1))} disabled={page === ledger.pages}>Next →</Button>
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}
