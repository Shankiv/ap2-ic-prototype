// index.js - AP2-style demo backend (educational HMAC signing)
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// In-memory demo store
let invoices = [
  { invoiceId: 'INV-123', amount: 120, dueDate: '2025-09-30', paid: false },
  { invoiceId: 'INV-124', amount: 80, dueDate: '2025-10-05', paid: false }
];
let mandates = {}; // mandateId -> {mandate, signed}
let receipts = [];

// Demo secret key for HMAC (change per environment)
const SECRET = process.env.DEV_SECRET || 'demo-key-please-change-123';

// Helpers
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function signMandate(mandateObj) {
  const payload = base64url(JSON.stringify(mandateObj));
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${payload}.${hmac}`;
}
function verifyMandate(compact) {
  const parts = compact.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

// Endpoints

// 1. List open invoices
app.get('/api/invoices/open', (req, res) => {
  res.json(invoices.filter(i => !i.paid));
});

// 2. Create Intent/Cart Mandate (signed)
app.post('/api/mandates', (req, res) => {
  // body: { userId, type: "Intent"|"Cart", action, amountLimit?, invoiceId?, expiry? }
  const body = req.body || {};
  if (!body.userId || !body.type || !body.action) {
    return res.status(400).json({ error: 'userId, type, action required' });
  }
  const mandateId = 'M-' + crypto.randomBytes(6).toString('hex');
  const mandate = {
    mandateId, createdAt: new Date().toISOString(), ...body
  };
  const signed = signMandate(mandate);
  mandates[mandateId] = { mandate, signed };
  res.json({ mandateId, signedMandate: signed });
});

// 3. Pay using mandate
app.post('/api/pay', (req, res) => {
  // body: { mandateId, signedMandate, invoiceId, paymentMethod }
  const { mandateId, signedMandate, invoiceId, paymentMethod } = req.body || {};
  if (!mandateId || !signedMandate || !invoiceId) {
    return res.status(400).json({ error: 'mandateId, signedMandate, invoiceId required' });
  }

  const mand = verifyMandate(signedMandate);
  if (!mand) return res.status(403).json({ error: 'invalid mandate signature' });

  if (mand.mandateId !== mandateId) return res.status(400).json({ error: 'mandateId mismatch' });

  const invoice = invoices.find(i => i.invoiceId === invoiceId);
  if (!invoice) return res.status(404).json({ error: 'invoice not found' });
  if (invoice.paid) return res.status(400).json({ error: 'invoice already paid' });

  if (mand.amountLimit && invoice.amount > mand.amountLimit) {
    return res.status(403).json({ error: 'invoice exceeds mandate amountLimit' });
  }

  // Mock payment processing — in prod integrate with gateway
  invoice.paid = true;
  const receipt = { receiptId: 'R-' + crypto.randomBytes(6).toString('hex'), invoiceId, amount: invoice.amount, paidAt: new Date().toISOString(), paymentMethod: paymentMethod || 'demo' };
  receipts.push(receipt);

  // Return audit trail info (signed mandate + receipt)
  res.json({ success: true, receipt, verifiedMandate: mand });
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AP2 demo backend running on ${port}`));
