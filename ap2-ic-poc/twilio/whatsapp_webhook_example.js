// Example: minimal Twilio webhook that maps WhatsApp text to agent endpoints
// Use with express and bodyParser; set Twilio sandbox incoming webhook to point here

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:5000';

app.post('/whatsapp-webhook', async (req, res) => {
  const from = req.body.From; // whatsapp:+123...
  const body = req.body.Body && req.body.Body.trim().toLowerCase();

  if (body.includes('show invoices')) {
    const r = await fetch(`${AGENT_URL}/agent/invoices/${encodeURIComponent(from)}`);
    const j = await r.json();
    const msg = j.summary.join('\n');
    // respond with TwiML
    res.send(`<Response><Message>${msg}</Message></Response>`);
    return;
  }

  if (body.startsWith('pay ')) {
    const invoiceId = body.split(' ')[1].toUpperCase();
    const r = await fetch(`${AGENT_URL}/agent/pay`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({userId: from, invoiceId})});
    const j = await r.json();
    const msg = j.payment ? `Paid ${invoiceId}: receipt ${j.payment.receipt.receiptId}` : JSON.stringify(j);
    res.send(`<Response><Message>${msg}</Message></Response>`);
    return;
  }

  res.send(`<Response><Message>Try: 'show invoices' or 'pay INV-123'</Message></Response>`);
});

app.listen(process.env.PORT||4000, ()=>console.log('WhatsApp webhook running'));
