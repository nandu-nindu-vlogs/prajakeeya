const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] uncaughtException:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH PREVENTED] unhandledRejection:', reason);
});

const { getDb } = require('./db/schema');
const { seed } = require('./db/seed');
const { checkAnomalies } = require('./services/anomaly');

const authRoutes        = require('./routes/auth');
const fileRoutes        = require('./routes/files');
const beneficiaryRoutes = require('./routes/beneficiary');
const procurementRoutes = require('./routes/procurement');
const financeRoutes     = require('./routes/finance');
const ledgerRoutes      = require('./routes/ledger');
const dashboardRoutes   = require('./routes/dashboard');
const grievanceRoutes   = require('./routes/grievances');
const documentRoutes    = require('./routes/documents');
const analyticsRoutes   = require('./routes/analytics');
const projectRoutes     = require('./routes/projects');

const app = express();
const PORT = process.env.PORT || 3001;

// In production Express serves the React build from the same origin, so CORS only
// matters for local dev. Allow localhost in dev, everything in production.
const corsOrigin = process.env.NODE_ENV === 'production'
  ? true   // same-origin in prod — Express serves both
  : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',          authRoutes);
app.use('/api/files',         fileRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/tenders',       procurementRoutes);
app.use('/api/finance',       financeRoutes);
app.use('/api/ledger',        ledgerRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/grievances',    grievanceRoutes);
app.use('/api/documents',     documentRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/projects',      projectRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React build in production (must be after all /api routes)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

app.use((err, req, res, next) => {
  console.error('[API ERROR]', req.method, req.path, '-', err.message);
  console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

cron.schedule('*/15 * * * *', () => {
  try {
    const alerts = checkAnomalies();
    if (alerts.length > 0) console.log('[CRON]', alerts.length, 'alert(s) raised');
  } catch (e) {
    console.error('[CRON ERROR]', e.message);
  }
});

async function start() {
  try { getDb(); await seed(); } catch (e) { console.error('[SEED ERROR]', e.message); }

  app.listen(PORT, () => {
    console.log('Prajakeeya API running on http://localhost:' + PORT);
    console.log('Citizens:    citizen1/2/3@gmail.com / citizen123');
    console.log('Officers:    officer1/2/3@prajakeeya.gov / officer123');
    console.log('Admin:       admin@prajakeeya.gov / admin123');
    console.log('Auditor:     auditor@prajakeeya.gov / auditor123');
    console.log('Contractors: contractor1/2/3@gmail.com / contractor123');
  });
}

start().catch(console.error);
