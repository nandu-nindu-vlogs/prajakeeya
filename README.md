# 🏛 ಪ್ರಜಾಕೀಯ | Prajakeeya
## Zero-Corruption Digital Governance System

---

## 🚀 Quick Start (2 commands)

```bash
# 1. Install all dependencies
cd prajakeeya
npm run install:all

# 2. Start everything (server + client)
npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001

---

## 🔑 Demo Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Citizen / ನಾಗರಿಕ | citizen1@gmail.com | citizen123 |
| Officer / ಅಧಿಕಾರಿ | officer1@prajakeeya.gov | officer123 |
| Admin / ನಿರ್ವಾಹಕ | admin@prajakeeya.gov | admin123 |
| Auditor / ಲೆಕ್ಕ | auditor@prajakeeya.gov | auditor123 |

---

## 🎯 Demo Flow (5 minutes to wow)

### 1. Citizen Journey
- Login as **citizen1@gmail.com**
- Go to **My Files** → see existing applications with real-time status
- Click **Submit** → file a new application
- Watch the immutable ledger record the action

### 2. Officer Action
- Login as **officer1@prajakeeya.gov**
- See pending files waiting for action
- **Approve or Reject** with a note
- Every action is hash-chained in the ledger

### 3. Fraud Detection (Most Impressive!)
- Login as **officer1**
- Go to **Beneficiaries** → click **Add**
- Try adding Aadhaar `4444-5555-6666` in "PM Kisan Samman Nidhi"
- 🚨 System instantly blocks it as a **DUPLICATE** — ghost beneficiary detected!

### 4. 3-Way Financial Match
- Login as **admin@prajakeeya.gov**
- Go to **Finance** → try creating a PO > remaining budget
- 🚨 Budget ceiling enforcement blocks it!
- On existing POs: Confirm GR → Submit Invoice with wrong amount → 3-Way Match FAILS!

### 5. Sealed Bidding
- Go to **Tenders** → submit a bid on Road Repair Contract
- As admin: click **Auto-Score & Award** → sealed bids revealed and auto-scored

### 6. Chain Integrity Verification
- Login as **auditor@prajakeeya.gov**
- Go to **Transparency** → click **Verify Chain**
- ✅ "Chain intact — no tampering detected"

---

## 🏗 Architecture

```
prajakeeya/
├── server/              # Node.js + Express API
│   ├── db/             # SQLite schema + seed data
│   ├── middleware/     # JWT auth + RBAC
│   ├── routes/         # All API endpoints
│   └── services/       # Ledger (hash chain) + Anomaly detection
└── client/             # React + Vite + Tailwind
    └── src/
        ├── pages/      # All UI pages
        ├── components/ # Reusable components
        ├── context/    # Auth context
        └── api/        # API calls
```

## 🔒 Corruption-Proof Mechanisms

1. **Immutable Ledger** — SHA-256 hash chain, every write creates a block
2. **Zero Discretion** — SLA auto-escalates if officer doesn't act in 48h
3. **Ghost-Proof** — Aadhaar deduplication blocks duplicate beneficiaries
4. **Sealed Bids** — Encrypted until deadline, auto-scored by algorithm
5. **3-Way Match** — PO + Goods Receipt + Invoice must all match
6. **AI Anomaly Detection** — Rapid approvals, vendor concentration, budget alerts
7. **RBAC** — Role-based access, no one sees what they shouldn't

---

Built for Prajakeeya · ಭ್ರಷ್ಟಾಚಾರ ರಹಿತ ಡಿಜಿಟಲ್ ಆಡಳಿತ
