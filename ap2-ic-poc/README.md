# AP2 IC Prototype

This repo contains a demo prototype that shows how to integrate Google AP2 concepts (mandates, intent/cart flow) with IC using an ADK-based agent and a simple AP2-style backend. Everything is designed to run using free developer tools and personal accounts.

## Contents
- `ap2-backend/` - Node.js demo backend (in-memory, HMAC signed mandates)
- `agent-adk-demo/` - Python ADK-styled agent (tools: invoice_tool, mandate_tool, payment_tool)
- `twilio/` - example Twilio WhatsApp webhook helper (optional)
- `adk-official-agent/` - template using Google ADK SDK (optional)
- `postman_ap2_demo.json` - Postman collection for the core flows

## Quickstart (local)
1. Start backend:
   ```bash
   cd ap2-backend
   npm install
   DEV_SECRET=some-demo-secret node index.js
