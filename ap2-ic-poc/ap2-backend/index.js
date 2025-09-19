// ap2-backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = process.env.DEV_SECRET || 'demo-secret-ic';

// ---------------- Invoices ----------------
let invoices = [
  { userId: 'test-user', invoiceId: 'INV-201', shortId: '201', category: 'utility', label: 'Electric — Eversource', vendor: 'Eversource Energy', description: 'Electric service - residential', amount: 145.23, dueDate: '2025-10-05', paid: false },
  { userId: 'test-user', invoiceId: 'INV-202', shortId: '202', category: 'utility', label: 'Natural Gas — National Grid', vendor: 'National Grid', description: 'Natural gas service', amount: 78.45, dueDate: '2025-10-07', paid: false },
  { userId: 'test-user', invoiceId: 'INV-203', shortId: '203', category: 'utility', label: 'Water & Sewer — City of Boston', vendor: 'Boston Water & Sewer', description: 'Water and sewer charges', amount: 62.10, dueDate: '2025-10-12', paid: false },
  { userId: 'test-user', invoiceId: 'INV-204', shortId: '204', category: 'utility', label: 'Internet — Xfinity', vendor: 'Comcast Xfinity', description: 'Business internet & cable', amount: 129.99, dueDate: '2025-10-03', paid: false },
  { userId: 'test-user', invoiceId: 'INV-205', shortId: '205', category: 'utility', label: 'Phone — Verizon', vendor: 'Verizon', description: 'Mobile & voice plan', amount: 59.99, dueDate: '2025-10-08', paid: false },
  { userId: 'test-user', invoiceId: 'INV-206', shortId: '206', category: 'insurance', label: 'Home Insurance — Liberty Mutual', vendor: 'Liberty Mutual', description: 'Homeowners insurance premium', amount: 320.00, dueDate: '2025-10-15', paid: false },
  { userId: 'test-user', invoiceId: 'INV-207', shortId: '207', category: 'insurance', label: 'Health Insurance — Blue Cross MA', vendor: 'Blue Cross Blue Shield of MA', description: 'Monthly health insurance premium', amount: 412.50, dueDate: '2025-10-20', paid: false },
  { userId: 'test-user', invoiceId: 'INV-208', shortId: '208', category: 'insurance', label: 'Commercial Insurance — Hanover', vendor: 'The Hanover Insurance Group', description: 'Business general liability', amount: 760.00, dueDate: '2025-10-18', paid: false },
  { userId: 'test-user', invoiceId: 'INV-209', shortId: '209', category: 'tax', label: 'Property Tax — City of Boston', vendor: 'City of Boston', description: 'Property tax installment', amount: 950.00, dueDate: '2025-10-01', paid: false },
  { userId: 'test-user', invoiceId: 'INV-210', shortId: '210', category: 'tax', label: 'State Tax — MA Dept. of Revenue', vendor: 'Massachusetts Dept. of Revenue', description: 'Quarterly state tax payment', amount: 1800.00, dueDate: '2025-10-11', paid: false },
  { userId: 'test-user', invoiceId: 'INV-211', shortId: '211', category: 'tax', label: 'Federal Tax — IRS', vendor: 'Internal Revenue Service', description: 'Estimated federal tax payment', amount: 2400.00, dueDate: '2025-10-15', paid: false },
  { userId: 'test-user', invoiceId: 'INV-212', shortId: '212', category: 'insurance', label: 'Flood Insurance — Northeast Flood', vendor: 'Northeast Flood Insurance', description: 'Flood insurance premium', amount: 220.00, dueDate: '2025-10-22', paid: false },
  { userId: 'test-user', invoiceId: 'INV-213', shortId: '213', category: 'insurance', label: 'Health — Harvard Pilgrim', vendor: 'Harvard Pilgrim Health Care', description: 'Supplemental health coverage', amount: 134.75, dueDate: '2025-10-09', paid: false },
  { userId: 'test-user', invoiceId: 'INV-214', shortId: '214', category: 'utility', label: 'Waste Collection — Boston Trash Services', vendor: 'Boston Trash Services', description: 'Commercial waste pickup', amount: 99.00, dueDate: '2025-10-06', paid: false },
  { userId: 'test-user', invoiceId: 'INV-215', shortId: '215', category: 'utility', label: 'Energy Surcharge — Eversource', vendor: 'Eversource Energy', description: 'One-time surcharge / adjustment', amount: 45.67, dueDate: '2025-10-04', paid: false }
];

let receipts = [];

// ---------- Helpers ----------
function ok(data, msg) { return { success: true, message: msg || 'ok', data }; }
function err(msg, code = 400) { return { success: false, message: msg, code }; }

// ---------- Endpoints ----------

// Invoices: supports userId, category, q (search)
app.get('/api/invoices', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const user = (req.query.userId || '').trim();
  const category = (req.query.category || '').toLowerCase();

  let results = invoices.slice();

  if (user) results = results.filter(i => i.userId === user);
  if (category) results = results.filter(i => (i.category || '').toLowerCase() === category);
  if (q) {
    results = results.filter(inv =>
      (inv.invoiceId || '').toLowerCase().includes(q) ||
      (inv.shortId || '').toLowerCase().includes(q) ||
      (inv.vendor || '').toLowerCase().includes(q) ||
      (inv.label || '').toLowerCase().includes(q) ||
      (inv.description || '').toLowerCase().includes(q)
    );
  } else {
    results = results.filter(i => !i.paid);
  }

  const message = q ? `Found ${results.length} invoices for "${q}"` : `Returning ${results.length} open invoices`;
  res.json(ok({ invoices: results }, message));
});

// Single invoice lookup
app.get('/api/invoices/:id', (req, res) => {
  const inv = invoices.find(i => i.invoiceId === req.params.id);
  if (!inv) return res.status(404).json(err('Invoice not found', 404));
  res.json(ok({ invoice: inv }, 'Invoice found'));
});

// Mandates
app.post('/api/mandates', (req, res) => {
  const { userId, type, action, amountLimit, invoiceId } = req.body;
  if (!userId || !invoiceId) return res.status(400).json(err('Missing fields'));
  const mandateId = `M-${Math.random().toString(36).substring(2, 10)}`;
  const mandate = { mandateId, createdAt: new Date().toISOString(), userId, type, action, amountLimit, invoiceId };
  const signedMandate = jwt.sign(mandate, SECRET);
  res.json(ok({ ...mandate, signedMandate }, 'Mandate created'));
});

// Pay
app.post('/api/pay', (req, res) => {
  const { mandateId, signedMandate, invoiceId, paymentMethod } = req.body;
  try {
    const verified = jwt.verify(signedMandate, SECRET);
    const inv = invoices.find(i => i.invoiceId === invoiceId);
    if (!inv || inv.paid) return res.status(400).json(err('Invoice not found or already paid'));

    inv.paid = true;
    const receipt = {
      receiptId: `R-${Math.random().toString(36).substring(2, 10)}`,
      invoiceId,
      amount: inv.amount,
      paymentMethod: paymentMethod || 'demo-card-xxxx',
      paidAt: new Date().toISOString()
    };
    receipts.push(receipt);
    res.json(ok({ receipt, verifiedMandate: verified }, 'Payment processed'));
  } catch (e) {
    res.status(400).json(err('Invalid mandate token'));
  }
});

// Receipts audit trail
app.get('/api/receipts', (req, res) => {
  res.json(ok({ receipts }, `Total ${receipts.length} receipts`));
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AP2 demo backend running on ${PORT}`));
