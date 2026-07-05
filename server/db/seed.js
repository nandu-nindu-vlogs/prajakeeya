const bcrypt = require('bcryptjs');
const { getDb } = require('./schema');
const { writeBlock } = require('../services/ledger');

async function seed() {
  const db = getDb();

  // ── PATCH: add contractor demo users if missing (works on existing DBs) ─────
  await patchContractors(db);

  // ── Full seed: only runs on completely empty DB ────────────────────────────
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 3) {
    // DB already has multiple users — still ensure key demo datasets exist
    console.log('[SEED] DB already seeded — ensuring demo datasets exist');
    await ensureDemoData(db);
    return;
  }

  // Wait — if we just patched contractors into an otherwise-full DB, we should stop here.
  // Only do full seed when DB was truly empty before patching.
  const nonContractor = db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'contractor'").get();
  if (nonContractor.c > 0) {
    console.log('[SEED] Partial DB detected — ensuring demo datasets exist');
    await ensureDemoData(db);
    return;
  }

  console.log('[SEED] Fresh DB — running full seed...');
  await fullSeed(db);
}

// Ensure demo datasets exist even on partially seeded DBs
async function ensureDemoData(db) {
  // Insert a few public projects, grievances, files and docs if missing
  const cntProjects = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
  if (cntProjects === 0) {
    db.prepare(`INSERT INTO projects (title,description,dept_id,contractor_name,budget,status,completion_pct,is_public,location,category)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run('Demo Road Repair - Sample', 'Demo: short description', 2, 'Rajesh Constructions Pvt Ltd', 500000, 'ongoing', 10, 1, 'Demo Location', 'Road Works');
  }

  const cntFiles = db.prepare('SELECT COUNT(*) as c FROM files').get().c;
  if (cntFiles === 0) {
    db.prepare('INSERT INTO files (title,category,status,citizen_id,dept_id,sla_hours,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run('Demo: Water Connection Application','utility_connection','submitted',1,6,72,'normal','2026-06-01','2026-06-01');
  }

  const cntGr = db.prepare('SELECT COUNT(*) as c FROM grievances').get().c;
  if (cntGr === 0) {
    db.prepare('INSERT INTO grievances (ticket_id,citizen_id,dept_id,subject,description,category,status,priority,sla_hours,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run('GRV-DEMO-001',1,2,'Demo grievance: street light','Demo description for grievance','service','open','medium',72,'2026-06-10');
  }

  const cntDocs = db.prepare('SELECT COUNT(*) as c FROM generated_documents').get().c;
  if (cntDocs === 0) {
    db.prepare('INSERT INTO generated_documents (citizen_id,doc_type,cert_number,citizen_name,citizen_aadhaar,data_json,status,valid_until) VALUES (?,?,?,?,?,?,?,?)')
      .run(1,'income','DEMO-INC-001','Demo User','0000-0000-0000',JSON.stringify({annual_income:100000}), 'active', new Date(Date.now()+365*24*3600*1000).toISOString());
  }

  console.log('[SEED] Ensured minimal demo datasets exist');
}

async function patchContractors(db) {
  const hash = (p) => bcrypt.hashSync(p, 8);

  const contractors = [
    {
      email: 'contractor1@gmail.com', name: 'Rajesh Constructions', password: 'contractor123',
      aadhaar: '9876-5432-1001',
      profile: { company_name:'Rajesh Constructions Pvt Ltd', contractor_type:'Civil',
        license_no:'KAR-CIV-2019-0042', gst_no:'29AABCR1234F1Z5', pan_no:'AABCR1234F',
        experience_years:12, turnover_cr:45.5, address:'#12, MG Road, Bengaluru - 560001',
        specialization:'Road Construction, Bridges, Infrastructure', verified:1 }
    },
    {
      email: 'contractor2@gmail.com', name: 'BuildRight Infra', password: 'contractor123',
      aadhaar: '9876-5432-1002',
      profile: { company_name:'BuildRight Infra Solutions', contractor_type:'General',
        license_no:'KAR-GEN-2020-0087', gst_no:'29AABCB5678G2Y6', pan_no:'AABCB5678G',
        experience_years:8, turnover_cr:22.3, address:'#45, Jayanagar, Bengaluru - 560041',
        specialization:'Government Buildings, Schools, Hospitals', verified:1 }
    },
    {
      email: 'contractor3@gmail.com', name: 'AquaTech Solutions', password: 'contractor123',
      aadhaar: '9876-5432-1003',
      profile: { company_name:'AquaTech Water Solutions', contractor_type:'Hydraulic',
        license_no:'KAR-HYD-2021-0033', gst_no:'29AABCA9012H3K7', pan_no:'AABCA9012H',
        experience_years:6, turnover_cr:15.8, address:'#78, Whitefield, Bengaluru - 560066',
        specialization:'Water Supply, Irrigation, STP Plants', verified:0 }
    },
  ];

  let patched = 0;
  for (const c of contractors) {
    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(c.email);
    if (exists) continue;

    // Check Aadhaar uniqueness
    const aadhaarUsed = db.prepare('SELECT id FROM users WHERE aadhaar_id=?').get(c.aadhaar);
    const aadhaarVal = aadhaarUsed ? null : c.aadhaar;

    try {
      const r = db.prepare(
        `INSERT INTO users (name, email, password_hash, role, aadhaar_id) VALUES (?,?,?,'contractor',?)`
      ).run(c.name, c.email, hash(c.password), aadhaarVal);

      const uid = r.lastInsertRowid;

      // Upsert profile
      const profExists = db.prepare('SELECT id FROM contractor_profiles WHERE user_id=?').get(uid);
      if (!profExists) {
        db.prepare(`
          INSERT INTO contractor_profiles
            (user_id, company_name, contractor_type, license_no, gst_no, pan_no,
             experience_years, turnover_cr, address, specialization, verified)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `).run(uid, c.profile.company_name, c.profile.contractor_type, c.profile.license_no,
               c.profile.gst_no, c.profile.pan_no, c.profile.experience_years,
               c.profile.turnover_cr, c.profile.address, c.profile.specialization, c.profile.verified);
      }
      patched++;
    } catch(e) {
      console.error('[SEED] Failed to patch contractor', c.email, e.message);
    }
  }
  if (patched > 0) console.log(`[SEED] Patched ${patched} contractor account(s).`);
}

async function fullSeed(db) {
  const hash = (p) => bcrypt.hashSync(p, 8);

  // ── DEPARTMENTS ──────────────────────────────────────────────────────────────
  const depts = [
    { name:'Revenue Department',         name_kn:'ಕಂದಾಯ ಇಲಾಖೆ' },
    { name:'Public Works Department',    name_kn:'ಸಾರ್ವಜನಿಕ ಕಾಮಗಾರಿ ಇಲಾಖೆ' },
    { name:'Health Department',          name_kn:'ಆರೋಗ್ಯ ಇಲಾಖೆ' },
    { name:'Education Department',       name_kn:'ಶಿಕ್ಷಣ ಇಲಾಖೆ' },
    { name:'Social Welfare Department',  name_kn:'ಸಮಾಜ ಕಲ್ಯಾಣ ಇಲಾಖೆ' },
    { name:'Water Resources Department', name_kn:'ಜಲ ಸಂಪನ್ಮೂಲ ಇಲಾಖೆ' },
  ];
  const deptIds = {};
  for (const d of depts) {
    const r = db.prepare('INSERT INTO departments (name, name_kn) VALUES (?,?)').run(d.name, d.name_kn);
    deptIds[d.name] = r.lastInsertRowid;
  }

  // ── USERS ─────────────────────────────────────────────────────────────────────
  const userDefs = [
    { name:'Ravi Kumar',          email:'citizen1@gmail.com',          role:'citizen',    password:'citizen123',    aadhaar:'1234-5678-9001' },
    { name:'Priya Sharma',        email:'citizen2@gmail.com',          role:'citizen',    password:'citizen123',    aadhaar:'1234-5678-9002' },
    { name:'Suresh Patil',        email:'citizen3@gmail.com',          role:'citizen',    password:'citizen123',    aadhaar:'1234-5678-9003' },
    { name:'Officer Nagaraj',     email:'officer1@prajakeeya.gov',     role:'officer',    password:'officer123',    dept:'Revenue Department' },
    { name:'Officer Deepa',       email:'officer2@prajakeeya.gov',     role:'officer',    password:'officer123',    dept:'Public Works Department' },
    { name:'Officer Manjula',     email:'officer3@prajakeeya.gov',     role:'officer',    password:'officer123',    dept:'Health Department' },
    { name:'Admin Vikram',        email:'admin@prajakeeya.gov',        role:'admin',      password:'admin123' },
    { name:'Auditor CAG',         email:'auditor@prajakeeya.gov',      role:'auditor',    password:'auditor123' },
    { name:'Rajesh Constructions',email:'contractor1@gmail.com',       role:'contractor', password:'contractor123', aadhaar:'9876-5432-1001' },
    { name:'BuildRight Infra',    email:'contractor2@gmail.com',       role:'contractor', password:'contractor123', aadhaar:'9876-5432-1002' },
    { name:'AquaTech Solutions',  email:'contractor3@gmail.com',       role:'contractor', password:'contractor123', aadhaar:'9876-5432-1003' },
  ];

  const userIds = {};
  for (const u of userDefs) {
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(u.email);
    if (existing) { userIds[u.email] = existing.id; continue; }
    const r = db.prepare(
      'INSERT INTO users (name, email, password_hash, role, aadhaar_id, dept_id) VALUES (?,?,?,?,?,?)'
    ).run(u.name, u.email, hash(u.password), u.role, u.aadhaar || null,
          u.dept ? deptIds[u.dept] : null);
    userIds[u.email] = r.lastInsertRowid;
  }

  // ── CONTRACTOR PROFILES ───────────────────────────────────────────────────────
  const cProfiles = [
    { email:'contractor1@gmail.com', company_name:'Rajesh Constructions Pvt Ltd', contractor_type:'Civil',     license_no:'KAR-CIV-2019-0042', gst_no:'29AABCR1234F1Z5', pan_no:'AABCR1234F', experience_years:12, turnover_cr:45.5,  address:'#12, MG Road, Bengaluru - 560001',    specialization:'Road Construction, Bridges, Infrastructure',  verified:1 },
    { email:'contractor2@gmail.com', company_name:'BuildRight Infra Solutions',    contractor_type:'General',   license_no:'KAR-GEN-2020-0087', gst_no:'29AABCB5678G2Y6', pan_no:'AABCB5678G', experience_years:8,  turnover_cr:22.3,  address:'#45, Jayanagar, Bengaluru - 560041',  specialization:'Government Buildings, Schools, Hospitals',    verified:1 },
    { email:'contractor3@gmail.com', company_name:'AquaTech Water Solutions',      contractor_type:'Hydraulic', license_no:'KAR-HYD-2021-0033', gst_no:'29AABCA9012H3K7', pan_no:'AABCA9012H', experience_years:6,  turnover_cr:15.8,  address:'#78, Whitefield, Bengaluru - 560066', specialization:'Water Supply, Irrigation, STP Plants',        verified:0 },
  ];
  for (const cp of cProfiles) {
    const uid = userIds[cp.email];
    if (!uid) continue;
    const exists = db.prepare('SELECT id FROM contractor_profiles WHERE user_id=?').get(uid);
    if (exists) continue;
    db.prepare(`
      INSERT INTO contractor_profiles (user_id,company_name,contractor_type,license_no,gst_no,pan_no,experience_years,turnover_cr,address,specialization,verified)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(uid, cp.company_name, cp.contractor_type, cp.license_no, cp.gst_no, cp.pan_no,
           cp.experience_years, cp.turnover_cr, cp.address, cp.specialization, cp.verified);
  }

  // ── BUDGET ENTRIES ────────────────────────────────────────────────────────────
  const budgets = [
    { dept:'Revenue Department',         allocated:5000000,  spent:1200000  },
    { dept:'Public Works Department',    allocated:25000000, spent:18500000 },
    { dept:'Health Department',          allocated:12000000, spent:7800000  },
    { dept:'Education Department',       allocated:15000000, spent:9200000  },
    { dept:'Social Welfare Department',  allocated:8000000,  spent:3400000  },
    { dept:'Water Resources Department', allocated:18000000, spent:11200000 },
  ];
  for (const b of budgets) {
    db.prepare('INSERT INTO budget_entries (dept_id, fiscal_year, allocated, spent) VALUES (?,2026,?,?)')
      .run(deptIds[b.dept], b.allocated, b.spent);
  }

  // ── FILES ─────────────────────────────────────────────────────────────────────
  const fileData = [
    { title:'Income Certificate - Ravi Kumar',     cat:'income_certificate',   status:'approved',     cid:'citizen1@gmail.com', oid:'officer1@prajakeeya.gov', did:'Revenue Department',         sla:24,  priority:'normal', created:'2026-06-02' },
    { title:'Caste Certificate - Priya Sharma',    cat:'caste_certificate',    status:'approved',     cid:'citizen2@gmail.com', oid:'officer1@prajakeeya.gov', did:'Revenue Department',         sla:48,  priority:'normal', created:'2026-06-03' },
    { title:'Building Plan Approval - Suresh',     cat:'building_permit',      status:'under_review', cid:'citizen3@gmail.com', oid:'officer2@prajakeeya.gov', did:'Public Works Department',    sla:120, priority:'high',   created:'2026-06-05' },
    { title:'Water Connection Application',        cat:'utility_connection',   status:'submitted',    cid:'citizen1@gmail.com', oid:null,                      did:'Water Resources Department', sla:72,  priority:'normal', created:'2026-06-07' },
    { title:'Scholarship Application - Priya',     cat:'scholarship',          status:'approved',     cid:'citizen2@gmail.com', oid:'officer3@prajakeeya.gov', did:'Education Department',       sla:48,  priority:'normal', created:'2026-06-08' },
    { title:'Medical Reimbursement Claim',         cat:'health_benefit',       status:'rejected',     cid:'citizen3@gmail.com', oid:'officer3@prajakeeya.gov', did:'Health Department',          sla:48,  priority:'high',   created:'2026-06-09' },
    { title:'Domicile Certificate - Ravi',         cat:'domicile_certificate', status:'approved',     cid:'citizen1@gmail.com', oid:'officer1@prajakeeya.gov', did:'Revenue Department',         sla:24,  priority:'normal', created:'2026-06-10' },
    { title:'Ration Card Update',                  cat:'ration_card',          status:'under_review', cid:'citizen2@gmail.com', oid:'officer1@prajakeeya.gov', did:'Social Welfare Department',  sla:72,  priority:'normal', created:'2026-06-11' },
    { title:'Road Repair Request - Jayanagar',     cat:'infrastructure',       status:'escalated',    cid:'citizen3@gmail.com', oid:'officer2@prajakeeya.gov', did:'Public Works Department',    sla:48,  priority:'urgent', created:'2026-06-12' },
    { title:'OBC Certificate - Suresh',            cat:'caste_certificate',    status:'approved',     cid:'citizen3@gmail.com', oid:'officer1@prajakeeya.gov', did:'Revenue Department',         sla:48,  priority:'normal', created:'2026-06-13' },
    { title:'Pension Scheme Application',          cat:'pension',              status:'submitted',    cid:'citizen1@gmail.com', oid:null,                      did:'Social Welfare Department',  sla:72,  priority:'normal', created:'2026-06-14' },
    { title:'School Transfer Certificate',         cat:'education',            status:'approved',     cid:'citizen2@gmail.com', oid:'officer3@prajakeeya.gov', did:'Education Department',       sla:24,  priority:'normal', created:'2026-06-15' },
    { title:'Land Record Mutation Request',        cat:'land_record',          status:'under_review', cid:'citizen3@gmail.com', oid:'officer1@prajakeeya.gov', did:'Revenue Department',         sla:120, priority:'high',   created:'2026-06-16' },
    { title:'Disability Certificate',             cat:'disability',            status:'approved',     cid:'citizen1@gmail.com', oid:'officer3@prajakeeya.gov', did:'Health Department',          sla:48,  priority:'high',   created:'2026-06-17' },
    { title:'Vehicle Pollution NOC',              cat:'noc',                   status:'approved',     cid:'citizen2@gmail.com', oid:'officer2@prajakeeya.gov', did:'Revenue Department',         sla:24,  priority:'low',    created:'2026-06-18' },
  ];

  const fileIds = [];
  for (const f of fileData) {
    const r = db.prepare(`
      INSERT INTO files (title, category, status, citizen_id, officer_id, dept_id, sla_hours, priority, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(f.title, f.cat, f.status, userIds[f.cid], f.oid ? userIds[f.oid] : null,
           deptIds[f.did], f.sla, f.priority, f.created, f.created);
    fileIds.push(r.lastInsertRowid);
    if (f.oid && f.status !== 'submitted') {
      const action = f.status === 'rejected' ? 'reject' : f.status === 'escalated' ? 'escalate' : 'approve';
      db.prepare(`INSERT INTO file_actions (file_id, actor_id, action, from_status, to_status, note) VALUES (?,?,?,?,?,?)`)
        .run(r.lastInsertRowid, userIds[f.oid], action, 'submitted', f.status,
             f.status === 'rejected' ? 'Documentation incomplete. Please resubmit.' : 'Verified and approved.');
    }
  }

  // ── TENDERS ───────────────────────────────────────────────────────────────────
  const tenderData = [
    { title:'NH-209 Resurfacing - 42km Bengaluru to Ramanagara', description:'Complete resurfacing with bitumen macadam and lane markings.', dept:'Public Works Department', budget:8500000, deadline:'2026-07-20', status:'open',    category:'Road Works',           criteria:[{name:'Price',weight:40},{name:'Technical',weight:40},{name:'Timeline',weight:20}] },
    { title:'Government PHC Building - Yelahanka',               description:'2-storey PHC with OPD, lab, and 10-bed ward.',              dept:'Health Department',          budget:12000000,deadline:'2026-06-30', status:'awarded', category:'Building Construction', criteria:[{name:'Price',weight:35},{name:'Technical',weight:45},{name:'Experience',weight:20}] },
    { title:'Smart Water Meters - 5000 Units',                   description:'IoT-enabled meters for Bengaluru North zone.',              dept:'Water Resources Department', budget:4500000, deadline:'2026-08-15', status:'open',    category:'Water Works',          criteria:[{name:'Price',weight:40},{name:'Technical',weight:60}] },
    { title:'Government High School Building - Kolar',           description:'3-storey school with 20 classrooms and labs.',             dept:'Education Department',       budget:18000000,deadline:'2026-06-15', status:'closed',  category:'Building Construction', criteria:[{name:'Price',weight:40},{name:'Technical',weight:60}] },
    { title:'Rural Road Connectivity - 8 Villages Tumkur',       description:'24km all-weather BT roads in Tumkur district.',           dept:'Public Works Department',    budget:6200000, deadline:'2026-09-30', status:'open',    category:'Road Works',           criteria:[{name:'Price',weight:45},{name:'Technical',weight:35},{name:'Local Labor',weight:20}] },
  ];

  const tenderIds = [];
  for (const t of tenderData) {
    const r = db.prepare(`INSERT INTO tenders (title, description, dept_id, budget, deadline, status, criteria_json, category, created_by) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(t.title, t.description, deptIds[t.dept], t.budget, t.deadline, t.status, JSON.stringify(t.criteria), t.category, userIds['admin@prajakeeya.gov']);
    tenderIds.push(r.lastInsertRowid);
  }

  // ── BIDS ─────────────────────────────────────────────────────────────────────
  // Tender 0 (open) — 3 sealed bids
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,revealed,is_winner) VALUES (?,?,?,?,?,?,?,0,0)`)
    .run(tenderIds[0], userIds['contractor1@gmail.com'], 'Rajesh Constructions Pvt Ltd','contractor1@gmail.com',7950000,82,'GSB+WMM+DBM+BC layers. 180-day timeline.');
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,revealed,is_winner) VALUES (?,?,?,?,?,?,?,0,0)`)
    .run(tenderIds[0], userIds['contractor2@gmail.com'], 'BuildRight Infra Solutions','contractor2@gmail.com',8200000,75,'Premium BC with 5yr maintenance warranty.');
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,revealed,is_winner) VALUES (?,?,?,?,?,?,?,0,0)`)
    .run(tenderIds[0], null, 'Karnataka Road Builders','roadbuilders@example.com',7600000,68,'Cost-optimized IRC standard approach.');

  // Tender 1 (awarded) — revealed bids
  const wBid = db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,score,revealed,is_winner) VALUES (?,?,?,?,?,?,?,?,1,1)`)
    .run(tenderIds[1], userIds['contractor2@gmail.com'], 'BuildRight Infra Solutions','contractor2@gmail.com',11200000,88,'GRIHA 3-star rated earthquake-resistant design.',87.3);
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,score,revealed,is_winner) VALUES (?,?,?,?,?,?,?,?,1,0)`)
    .run(tenderIds[1], userIds['contractor1@gmail.com'], 'Rajesh Constructions Pvt Ltd','contractor1@gmail.com',10800000,71,'Standard PWD spec construction.',74.6);
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,score,revealed,is_winner) VALUES (?,?,?,?,?,?,?,?,1,0)`)
    .run(tenderIds[1], null, 'Akash Builders','akash@builders.com',11800000,65,'Basic construction.',65.2);
  db.prepare('UPDATE tenders SET winner_bid_id=? WHERE id=?').run(wBid.lastInsertRowid, tenderIds[1]);

  // Tender 2 (open) — 2 sealed bids
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,revealed,is_winner) VALUES (?,?,?,?,?,?,?,0,0)`)
    .run(tenderIds[2], userIds['contractor3@gmail.com'], 'AquaTech Water Solutions','contractor3@gmail.com',4150000,91,'NB-IoT meters with 15yr battery, real-time leakage detection.');
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,revealed,is_winner) VALUES (?,?,?,?,?,?,?,0,0)`)
    .run(tenderIds[2], null, 'HydroTech India','hydrotech@india.com',4380000,78,'GSM meters with cloud monitoring.');

  // Tender 3 (closed)
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,score,revealed,is_winner) VALUES (?,?,?,?,?,?,?,?,1,0)`)
    .run(tenderIds[3], userIds['contractor1@gmail.com'], 'Rajesh Constructions Pvt Ltd','contractor1@gmail.com',17200000,79,'Modern school green design.',76.8);
  db.prepare(`INSERT INTO bids (tender_id,contractor_id,vendor_name,vendor_email,amount,technical_score,proposal,score,revealed,is_winner) VALUES (?,?,?,?,?,?,?,?,1,0)`)
    .run(tenderIds[3], userIds['contractor2@gmail.com'], 'BuildRight Infra Solutions','contractor2@gmail.com',16800000,84,'CPWD-compliant.',81.2);

  // ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
  const poRows = [
    { vendor:'BuildRight Infra Solutions',  amount:11200000, desc:'PHC Building - Yelahanka',          dept:'Health Department',          status:'paid',             tender:tenderIds[1] },
    { vendor:'Rajesh Constructions Pvt Ltd',amount:2800000,  desc:'Road Repair - Residency Road',      dept:'Public Works Department',    status:'matched' },
    { vendor:'National Medical Supplies',   amount:450000,   desc:'Surgical Equipment - PHC Yelahanka',dept:'Health Department',          status:'invoice_submitted', mismatch_reason:'Invoice ₹4,72,000 ≠ PO ₹4,50,000. Difference: ₹22,000. Payment blocked.' },
    { vendor:'EduTech Solutions',           amount:680000,   desc:'School Lab Equipment - Kolar',      dept:'Education Department',       status:'gr_submitted' },
    { vendor:'Karnataka Cement Corp',       amount:1200000,  desc:'Cement Supply for 3 Projects',      dept:'Public Works Department',    status:'created' },
    { vendor:'AquaTech Water Solutions',    amount:920000,   desc:'Pump Installation - Rural Water',   dept:'Water Resources Department', status:'paid' },
  ];

  const poIds = [];
  for (const po of poRows) {
    const r = db.prepare(`
      INSERT INTO purchase_orders (vendor_name,amount,description,dept_id,tender_id,created_by,status,match_status,mismatch_reason,paid_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(po.vendor, po.amount, po.desc, deptIds[po.dept], po.tender || null,
           userIds['officer2@prajakeeya.gov'], po.status,
           ['matched','paid'].includes(po.status) ? 'matched' : po.mismatch_reason ? 'mismatch' : null,
           po.mismatch_reason || null,
           ['matched','paid'].includes(po.status) ? '2026-06-20T10:30:00' : null);
    poIds.push(r.lastInsertRowid);

    if (['gr_submitted','invoice_submitted','matched','paid'].includes(po.status)) {
      db.prepare('INSERT INTO goods_receipts (po_id,received_by,quantity_received,notes,received_at) VALUES (?,?,?,?,?)')
        .run(r.lastInsertRowid, userIds['officer2@prajakeeya.gov'], 100, 'All items received.', '2026-06-18T09:00:00');
    }
    if (['invoice_submitted','matched','paid'].includes(po.status)) {
      const invAmt = po.mismatch_reason ? po.amount * 1.049 : po.amount;
      const invStatus = ['matched','paid'].includes(po.status) ? 'matched' : 'submitted';
      db.prepare('INSERT INTO invoices (po_id,invoice_number,amount,status,submitted_at) VALUES (?,?,?,?,?)')
        .run(r.lastInsertRowid, `INV-${String(r.lastInsertRowid).padStart(4,'0')}`, invAmt, invStatus, '2026-06-19T14:00:00');
    }
  }

  // ── PROJECTS ──────────────────────────────────────────────────────────────────
  const projectData = [
    { title:'NH-209 Resurfacing - Bengaluru to Ramanagara', description:'42km highway resurfacing. 2 lakh daily commuters benefited.', dept:'Public Works Department', ce:'contractor1@gmail.com', cn:'Rajesh Constructions Pvt Ltd', budget:8500000, cost:3200000, start:'2026-04-01', end:'2026-10-31', status:'ongoing', pct:38, loc:'NH-209, Bengaluru to Ramanagara', cat:'Road Infrastructure' },
    { title:'Primary Health Center - Yelahanka',            description:'2-storey PHC. 50,000 residents served.',                      dept:'Health Department',          ce:'contractor2@gmail.com', cn:'BuildRight Infra Solutions',    budget:12000000,cost:11200000,start:'2025-10-01',end:'2026-06-30', status:'completed',pct:100,loc:'Sector 12, Yelahanka, Bengaluru',cat:'Healthcare Infrastructure' },
    { title:'Smart Water Meters - Bengaluru North Zone',    description:'5000 IoT smart meters. 30% leakage reduction target.',        dept:'Water Resources Department', ce:'contractor3@gmail.com', cn:'AquaTech Water Solutions',      budget:4500000, cost:850000, start:'2026-06-01',end:'2026-11-30', status:'ongoing', pct:19, loc:'Bengaluru North Zone - 28 Wards',cat:'Water Infrastructure' },
    { title:'Government High School - Kolar',               description:'3-storey school for 1200 students with smart classrooms.',    dept:'Education Department',       ce:'contractor2@gmail.com', cn:'BuildRight Infra Solutions',    budget:18000000,cost:4500000,start:'2026-05-01', end:'2027-04-30', status:'delayed',  pct:25, loc:'Kolar Town, Kolar District',     cat:'Education Infrastructure' },
    { title:'Rural Road Connectivity - Tumkur 8 Villages',  description:'24km all-weather roads. 12,000 rural residents connected.',  dept:'Public Works Department',    ce:'contractor1@gmail.com', cn:'Rajesh Constructions Pvt Ltd', budget:6200000, cost:0,       start:'2026-10-01',end:'2027-06-30', status:'planning', pct:0,  loc:'8 Villages, Tumkur District',    cat:'Road Infrastructure' },
    { title:'Sewage Treatment Plant - Electronic City',     description:'10 MLD STP. Zero-liquid discharge compliant.',               dept:'Water Resources Department', ce:'contractor3@gmail.com', cn:'AquaTech Water Solutions',      budget:22000000,cost:7800000,start:'2025-12-01', end:'2027-03-31', status:'ongoing', pct:35, loc:'Electronic City Phase 2, Bengaluru', cat:'Sanitation & Sewage' },
  ];

  const projectIds = [];
  for (const p of projectData) {
    const r = db.prepare(`
      INSERT INTO projects (title,description,dept_id,contractor_id,contractor_name,budget,actual_cost,start_date,expected_end_date,status,completion_pct,location,category,is_public)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)
    `).run(p.title, p.description, deptIds[p.dept], userIds[p.ce]||null, p.cn,
           p.budget, p.cost, p.start, p.end, p.status, p.pct, p.loc, p.cat);
    projectIds.push(r.lastInsertRowid);
  }

  // ── PROJECT UPDATES ───────────────────────────────────────────────────────────
  const updates = [
    { pid:0,actor:'officer2@prajakeeya.gov',type:'milestone',desc:'Site survey complete. Alignment finalized with NHAI.',pct:5,date:'2026-04-10' },
    { pid:0,actor:'contractor1@gmail.com',type:'progress',desc:'GSB layer laid for first 12km. WMM application starting.',pct:15,date:'2026-05-02' },
    { pid:0,actor:'contractor1@gmail.com',type:'milestone',desc:'WMM layer done for 20km. QC tests passed.',pct:28,date:'2026-05-25' },
    { pid:0,actor:'officer2@prajakeeya.gov',type:'progress',desc:'DBM layer in progress. 38% complete as per schedule.',pct:38,date:'2026-06-20' },
    { pid:1,actor:'officer3@prajakeeya.gov',type:'milestone',desc:'Foundation and RCC frame complete.',pct:30,date:'2025-12-15' },
    { pid:1,actor:'contractor2@gmail.com',type:'progress',desc:'Brick masonry, plastering, wiring done.',pct:65,date:'2026-02-20' },
    { pid:1,actor:'contractor2@gmail.com',type:'milestone',desc:'All civil works complete. HVAC and plumbing done.',pct:90,date:'2026-05-10' },
    { pid:1,actor:'officer3@prajakeeya.gov',type:'completion',desc:'PHC handed over to Health Dept. Inauguration June 28.',pct:100,date:'2026-06-25' },
    { pid:2,actor:'contractor3@gmail.com',type:'milestone',desc:'950 meters installed in Ward 1-5. IoT connectivity tested.',pct:19,date:'2026-06-20' },
    { pid:3,actor:'contractor2@gmail.com',type:'milestone',desc:'Foundation complete. Ground floor columns erected.',pct:15,date:'2026-05-20' },
    { pid:3,actor:'contractor2@gmail.com',type:'delay',desc:'Delay due to cement shortage and land boundary dispute.',pct:25,date:'2026-06-10' },
    { pid:3,actor:'officer3@prajakeeya.gov',type:'issue',desc:'Project delayed 45 days. Show-cause notice issued to contractor.',pct:25,date:'2026-06-15' },
    { pid:4,actor:'officer2@prajakeeya.gov',type:'milestone',desc:'DPR approved. Tender awarded. Work to start Oct 2026.',pct:0,date:'2026-06-20' },
    { pid:5,actor:'contractor3@gmail.com',type:'milestone',desc:'Aeration tanks complete. Bio-reactor installation started.',pct:20,date:'2026-02-15' },
    { pid:5,actor:'officer2@prajakeeya.gov',type:'progress',desc:'35% complete. MBR technology installation on track.',pct:35,date:'2026-06-18' },
  ];

  const userLookup = Object.fromEntries(userDefs.map(u => [u.email, { name:u.name, role:u.role }]));
  for (const u of updates) {
    db.prepare(`INSERT INTO project_updates (project_id,actor_id,actor_name,actor_role,update_type,description,completion_pct,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(projectIds[u.pid], userIds[u.actor], userLookup[u.actor]?.name||'System', userLookup[u.actor]?.role||'officer', u.type, u.desc, u.pct, u.date);
  }

  // ── PROJECT OBJECTIONS ────────────────────────────────────────────────────────
  const objections = [
    { pid:0,citizen:'citizen2@gmail.com',cname:'Priya Sharma',     subject:'Why is project 2 months behind original schedule?',           desc:'NH-209 was supposed to start Feb 2026 but started April. Requesting explanation.',  cat:'query',      status:'answered', response:'Delayed due to NHAI environmental clearance received March 28. Revised completion: Oct 31, 2026. Budget unchanged.',resp_by:'officer2@prajakeeya.gov',resp_at:'2026-06-22' },
    { pid:0,citizen:'citizen3@gmail.com',cname:'Suresh Patil',      subject:'Substandard material — potholes forming within 2 weeks!',     desc:'WMM layer near 15km mark showing distress. Is QC being done properly?',             cat:'objection',  status:'open' },
    { pid:1,citizen:'citizen1@gmail.com',cname:'Ravi Kumar',        subject:'When will PHC actually start functioning?',                   desc:'Building done but no doctors/equipment. Promised from April 2026. What is status?',   cat:'query',      status:'answered', response:'PHC operational July 1, 2026. Staff recruited (2 doctors, 5 nurses). Equipment being installed.',resp_by:'officer3@prajakeeya.gov',resp_at:'2026-06-23' },
    { pid:3,citizen:'citizen1@gmail.com',cname:'Ravi Kumar',        subject:'Wrong location — area floods every monsoon!',                  desc:'Site is low-lying, waterlogged 3 months in 2024. Please reconsider.',                 cat:'objection',  status:'answered', response:'Elevated plinth (2ft above flood level) and dedicated stormwater drainage added to design at no extra cost.',resp_by:'officer3@prajakeeya.gov',resp_at:'2026-06-18' },
    { pid:3,citizen:'citizen2@gmail.com',cname:'Priya Sharma',      subject:'Suggestion: Add vocational training center',                  desc:'Vocational training wing would reduce dropout rate and boost employment.',             cat:'suggestion', status:'open' },
    { pid:5,citizen:'citizen3@gmail.com',cname:'Suresh Patil',      subject:'Will STP cause odor problem for nearby residents?',           desc:'I live 500m from site. Requesting environmental impact assessment.',                   cat:'query',      status:'open' },
  ];

  for (const o of objections) {
    db.prepare(`INSERT INTO project_objections (project_id,citizen_id,citizen_name,subject,description,category,status,response,responded_by,responded_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(projectIds[o.pid], userIds[o.citizen], o.cname, o.subject, o.desc, o.cat, o.status,
           o.response||null, o.resp_by ? userIds[o.resp_by] : null, o.resp_at||null);
  }

  // ── BENEFICIARIES ─────────────────────────────────────────────────────────────
  const bens = [
    { name:'Kamala Devi',     aadhaar:'1111-2222-3333', scheme:'PM Awas Yojana',     amount:120000, status:'approved',  bank:'SBIN0001234/1234567890', ref:'NEFT2026060101' },
    { name:'Ramu Nayak',      aadhaar:'2222-3333-4444', scheme:'Kisan Samman Nidhi', amount:6000,   status:'approved',  bank:'CNRB0002345/2345678901', ref:'NEFT2026060102' },
    { name:'Geetha Bai',      aadhaar:'3333-4444-5555', scheme:'Widow Pension',       amount:1500,   status:'approved',  bank:'HDFC0003456/3456789012', ref:'NEFT2026060103' },
    { name:'Mohan Lal',       aadhaar:'4444-5555-6666', scheme:'SC/ST Scholarship',   amount:25000,  status:'verified',  bank:'ICIC0004567/4567890123' },
    { name:'Savitha R',       aadhaar:'5555-6666-7777', scheme:'Disability Pension',  amount:3000,   status:'pending',   bank:'' },
    { name:'Deepak Kumar',    aadhaar:'6666-7777-8888', scheme:'PM Awas Yojana',     amount:120000, status:'approved',  bank:'SBIN0005678/5678901234', ref:'NEFT2026060104' },
    { name:'Usha Rani',       aadhaar:'7777-8888-9999', scheme:'Old Age Pension',     amount:2000,   status:'verified',  bank:'CNRB0006789/6789012345' },
    { name:'Prakash BM',      aadhaar:'8888-9999-0000', scheme:'Kisan Samman Nidhi', amount:6000,   status:'approved',  bank:'HDFC0007890/7890123456', ref:'NEFT2026060105' },
    { name:'Kamala D (ALIAS)',aadhaar:'1111-2222-3333', scheme:'PM Awas Yojana',     amount:120000, status:'duplicate', bank:'AXIS0009876/9876543210', notes:'FRAUD: Same Aadhaar as entry #1. Ghost beneficiary attempt blocked.' },
    { name:'Geetha Bai (DUP)',aadhaar:'3333-4444-5555', scheme:'MGNREGS',            amount:18000,  status:'duplicate', bank:'PUNB0001111/1111222233',  notes:'FRAUD: Duplicate Aadhaar 3333-4444-5555.' },
    { name:'Santosh Kumar',   aadhaar:'9999-0000-1111', scheme:'SC/ST Scholarship',  amount:25000,  status:'approved',  bank:'SBIN0009999/9999000011', ref:'NEFT2026060106' },
    { name:'Lakshmi Patel',   aadhaar:'0000-1111-2222', scheme:'Widow Pension',       amount:1500,   status:'rejected',  bank:'', notes:'Rejected: Husband alive. Document forgery detected.' },
  ];
  for (const b of bens) {
    db.prepare(`INSERT INTO beneficiaries (name,aadhaar_id,scheme,amount,status,verified_by,bank_account,transfer_ref,notes) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(b.name, b.aadhaar, b.scheme, b.amount, b.status,
           ['approved','verified','duplicate'].includes(b.status) ? userIds['officer1@prajakeeya.gov'] : null,
           b.bank||'', b.ref||null, b.notes||null);
  }

  // ── GRIEVANCES ────────────────────────────────────────────────────────────────
  const grievances = [
    { ticket:'GRV-2026-001', cid:'citizen1@gmail.com', dept:'Public Works Department',    subject:'Pothole on MG Road causing accidents',            desc:'2-foot pothole near MG Road-Brigade Road junction. 3 accidents last week.', cat:'service',    status:'resolved',   priority:'critical', note:'Repair completed June 20.' },
    { ticket:'GRV-2026-002', cid:'citizen2@gmail.com', dept:'Revenue Department',         subject:'Income certificate delayed beyond SLA',            desc:'Applied June 2, not issued after 20 days. SLA is 7 days.',                  cat:'delay',      status:'escalated',  priority:'high',     note:'' },
    { ticket:'GRV-2026-003', cid:'citizen3@gmail.com', dept:'Health Department',          subject:'Bribery demand at PHC registration counter',       desc:'Clerk demanded ₹500 for free delivery registration. Staff ID: HLT-234.',    cat:'corruption', status:'in_progress',priority:'critical', note:'Complaint with vigilance. Inquiry started.' },
    { ticket:'GRV-2026-004', cid:'citizen1@gmail.com', dept:'Water Resources Department', subject:'Contaminated water supply - brownish & foul smell', desc:'Water in Jayanagar 4th Block contaminated since June 15. Test pending.',    cat:'service',    status:'open',       priority:'high',     note:'' },
    { ticket:'GRV-2026-005', cid:'citizen2@gmail.com', dept:'Education Department',       subject:'Teacher absent 3 months — no action taken',        desc:'Maths teacher at Govt HS Kolar absent since March. No substitute.',         cat:'service',    status:'resolved',   priority:'high',     note:'Teacher suspended. Guest lecturer appointed.' },
    { ticket:'GRV-2026-006', cid:'citizen3@gmail.com', dept:'Social Welfare Department',  subject:'Old age pension not received for 4 months',         desc:'78-year-old mother not getting pension since Feb 2026.',                   cat:'delay',      status:'in_progress',priority:'high',     note:'Bank transfer issue identified. Re-payment initiated.' },
    { ticket:'GRV-2026-007', cid:'citizen1@gmail.com', dept:'Revenue Department',         subject:'Suggestion: Online slot booking for certificates',  desc:'Revenue office needs online slots. Long queues hurt elderly/disabled.',     cat:'other',      status:'closed',     priority:'low',      note:'Forwarded to IT dept for implementation.' },
    { ticket:'GRV-2026-008', cid:'citizen2@gmail.com', dept:'Public Works Department',    subject:'Street lights not working for 2 weeks',             desc:'18 lights on Mysore Road (3rd-7th cross) dark since June 8.',              cat:'service',    status:'open',       priority:'medium',   note:'' },
  ];
  for (const g of grievances) {
    const r = db.prepare(`INSERT INTO grievances (ticket_id,citizen_id,dept_id,subject,description,category,status,priority,sla_hours,resolution_note) VALUES (?,?,?,?,?,?,?,?,72,?)`)
      .run(g.ticket, userIds[g.cid], deptIds[g.dept], g.subject, g.desc, g.cat, g.status, g.priority, g.note||null);
    db.prepare(`INSERT INTO grievance_updates (grievance_id,actor_id,actor_name,actor_role,action,note) VALUES (?,?,?,?,?,?)`)
      .run(r.lastInsertRowid, userIds[g.cid], userDefs.find(u=>u.email===g.cid)?.name||'Citizen', 'citizen', 'filed', g.desc.substring(0,80));
  }

  // ── GENERATED DOCUMENTS ───────────────────────────────────────────────────────
  const docs = [
    { cid:'citizen1@gmail.com', type:'income',           cert:'INC-2026-RK001', name:'Ravi Kumar',   aadhaar:'1234-5678-9001', data:{ annual_income:240000, source:'Agriculture', purpose:'Bank loan', valid_for:'1 year' } },
    { cid:'citizen2@gmail.com', type:'caste',            cert:'CST-2026-PS001', name:'Priya Sharma', aadhaar:'1234-5678-9002', data:{ caste:'Scheduled Caste', sub_caste:'Madiga', purpose:'Scholarship', valid_for:'Lifetime' } },
    { cid:'citizen3@gmail.com', type:'domicile',         cert:'DOM-2026-SU001', name:'Suresh Patil', aadhaar:'1234-5678-9003', data:{ years:18, district:'Bengaluru Urban', purpose:'Government job', valid_for:'3 years' } },
    { cid:'citizen1@gmail.com', type:'domicile',         cert:'DOM-2026-RK001', name:'Ravi Kumar',   aadhaar:'1234-5678-9001', data:{ years:32, district:'Bengaluru Urban', purpose:'Passport', valid_for:'3 years' } },
    { cid:'citizen2@gmail.com', type:'scheme_eligibility',cert:'SCH-2026-PS001',name:'Priya Sharma', aadhaar:'1234-5678-9002', data:{ scheme:'PM Awas Yojana', eligible:true, income:180000, purpose:'Housing subsidy' } },
    { cid:'citizen3@gmail.com', type:'income',           cert:'INC-2026-SU001', name:'Suresh Patil', aadhaar:'1234-5678-9003', data:{ annual_income:360000, source:'Self-employed', purpose:'Educational loan' } },
  ];
  for (const d of docs) {
    db.prepare(`INSERT INTO generated_documents (citizen_id,doc_type,cert_number,citizen_name,citizen_aadhaar,data_json,status,valid_until) VALUES (?,?,?,?,?,?,?,?)`)
      .run(userIds[d.cid], d.type, d.cert, d.name, d.aadhaar, JSON.stringify(d.data), 'active',
           new Date(Date.now()+365*24*60*60*1000).toISOString());
  }

  // ── ALERTS ────────────────────────────────────────────────────────────────────
  const alertData = [
    ['fraud_blocked','critical','Duplicate Aadhaar 1111-2222-3333 — PM Awas Yojana ghost beneficiary blocked.','beneficiary',9],
    ['fraud_blocked','critical','Duplicate Aadhaar 3333-4444-5555 — MGNREGS ghost entry blocked.','beneficiary',10],
    ['invoice_mismatch','critical','3-Way Match FAILED: PO-3 invoice ₹4,72,000 ≠ PO ₹4,50,000. Payment BLOCKED.','purchase_order',3],
    ['sla_breach','high','SLA breached: GRV-2026-002 income cert delay exceeded 72h. Escalated to District Collector.','grievance',2],
    ['sla_breach','high','SLA breached: GRV-2026-004 water contamination — 96h no action. Health risk.','grievance',4],
    ['project_delay','medium','Project delayed 45 days: Govt High School Kolar. Show-cause notice issued.','project',4],
    ['rapid_approval','medium','Anomaly: officer1@prajakeeya.gov approved 5 files in 30 mins. Flagged.','user',4],
    ['budget_risk','high','Public Works: 74% budget used with 6 months remaining FY2026. Overrun risk.','department',2],
    ['corruption_complaint','critical','Bribery complaint filed against PHC staff. Vigilance notified. GRV-2026-003.','grievance',3],
  ];
  for (const a of alertData) {
    db.prepare(`INSERT INTO alerts (type,severity,message,entity_type,entity_id) VALUES (?,?,?,?,?)`).run(...a);
  }

  // ── LEDGER BLOCKS ─────────────────────────────────────────────────────────────
  const blocks = [
    { actor:'admin@prajakeeya.gov',    type:'TENDER_CREATE',    entity:'tender',         id:1, payload:{ title:'NH-209 Resurfacing', budget:8500000 } },
    { actor:'contractor1@gmail.com',   type:'BID_SUBMIT',       entity:'bid',            id:1, payload:{ tender_id:1, vendor:'Rajesh Constructions', amount_sealed:true } },
    { actor:'contractor2@gmail.com',   type:'BID_SUBMIT',       entity:'bid',            id:2, payload:{ tender_id:1, vendor:'BuildRight Infra', amount_sealed:true } },
    { actor:'admin@prajakeeya.gov',    type:'TENDER_AWARD',     entity:'tender',         id:2, payload:{ winner:'BuildRight Infra', amount:11200000, score:87.3 } },
    { actor:'officer2@prajakeeya.gov', type:'PO_CREATE',        entity:'purchase_order', id:1, payload:{ vendor:'BuildRight Infra', amount:11200000 } },
    { actor:'officer2@prajakeeya.gov', type:'3WAY_MATCH_PASS',  entity:'purchase_order', id:1, payload:{ invoice:'INV-0001', amount:11200000, match:'PASS' } },
    { actor:'officer1@prajakeeya.gov', type:'FILE_APPROVED',    entity:'file',           id:1, payload:{ title:'Income Certificate - Ravi Kumar' } },
    { actor:'system',                  type:'FRAUD_BLOCKED',    entity:'beneficiary',    id:9, payload:{ aadhaar:'1111-2222-3333', reason:'Duplicate' } },
    { actor:'system',                  type:'FRAUD_BLOCKED',    entity:'beneficiary',    id:10,payload:{ aadhaar:'3333-4444-5555', reason:'Duplicate' } },
    { actor:'officer2@prajakeeya.gov', type:'INVOICE_MISMATCH', entity:'purchase_order', id:3, payload:{ po:450000, invoice:472000, blocked:true } },
    { actor:'citizen3@gmail.com',      type:'CORRUPTION_REPORT',entity:'grievance',      id:3, payload:{ ticket:'GRV-2026-003', type:'bribery' } },
    { actor:'officer1@prajakeeya.gov', type:'DOC_ISSUED',       entity:'document',       id:1, payload:{ type:'income', cert:'INC-2026-RK001' } },
    { actor:'officer2@prajakeeya.gov', type:'PROJECT_UPDATE',   entity:'project',        id:1, payload:{ title:'NH-209 Resurfacing', pct:38 } },
  ];
  for (const b of blocks) {
    try {
      writeBlock({ actor_id:b.actor!=='system'?(userIds[b.actor]||null):null, actor_email:b.actor,
                   action_type:b.type, entity_type:b.entity, entity_id:b.id, payload:b.payload });
    } catch(e) { /* skip dup */ }
  }

  console.log('[SEED] Done.');
  console.log('  Citizens:     citizen1/2/3@gmail.com / citizen123');
  console.log('  Officers:     officer1/2/3@prajakeeya.gov / officer123');
  console.log('  Admin:        admin@prajakeeya.gov / admin123');
  console.log('  Auditor:      auditor@prajakeeya.gov / auditor123');
  console.log('  Contractors:  contractor1/2/3@gmail.com / contractor123');
}

module.exports = { seed };
