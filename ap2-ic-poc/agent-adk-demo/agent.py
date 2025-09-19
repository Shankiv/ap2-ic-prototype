# agent.py - simple ADK-styled agent for demo
from flask import Flask, request, jsonify
import requests
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

BACKEND = os.environ.get('BACKEND_URL', 'http://localhost:3000')

app = Flask(__name__)

# --- Tools (invoice_tool, mandate_tool, payment_tool) ---
def invoice_tool_list(user_id):
    r = requests.get(f"{BACKEND}/api/invoices/open")
    r.raise_for_status()
    return r.json()

def mandate_tool_create(user_id, mtype, action, amountLimit=None, invoiceId=None, expiry=None):
    payload = {"userId": user_id, "type": mtype, "action": action}
    if amountLimit: payload['amountLimit'] = amountLimit
    if invoiceId: payload['invoiceId'] = invoiceId
    if expiry: payload['expiry'] = expiry
    r = requests.post(f"{BACKEND}/api/mandates", json=payload)
    r.raise_for_status()
    return r.json()  # { mandateId, signedMandate }

def payment_tool_pay(mandateId, signedMandate, invoiceId, paymentMethod=None):
    payload = {"mandateId": mandateId, "signedMandate": signedMandate, "invoiceId": invoiceId, "paymentMethod": paymentMethod}
    r = requests.post(f"{BACKEND}/api/pay", json=payload)
    r.raise_for_status()
    return r.json()

# --- Agent endpoints (simulate an agent accessible over webhooks) ---

# 1. Query open invoices (e.g., user: "show my invoices")
@app.route('/agent/invoices/<user_id>', methods=['GET'])
def agent_list_invoices(user_id):
    inv = invoice_tool_list(user_id)
    # Convert to human-friendly summary
    summary = [f"{i['invoiceId']}: ${i['amount']} due {i['dueDate']}" for i in inv]
    return jsonify({"summary": summary, "raw": inv})

# 2. Create intent mandate for user rule (e.g., "pay utilities < $200 automatically")
@app.route('/agent/intent', methods=['POST'])
def agent_create_intent():
    data = request.json or {}
    user_id = data.get('userId')
    amountLimit = data.get('amountLimit')
    action = data.get('action', 'autopay')
    resp = mandate_tool_create(user_id=user_id, mtype='Intent', action=action, amountLimit=amountLimit)
    return jsonify(resp)

# 3. Pay invoice flow: agent creates cart mandate & pays (simulate user approved via chat/voice)
@app.route('/agent/pay', methods=['POST'])
def agent_pay_invoice():
    data = request.json or {}
    user_id = data.get('userId')
    invoiceId = data.get('invoiceId')
    # Step A: create Cart Mandate with exact invoice & amount (fetch invoice details)
    invs = invoice_tool_list(user_id)
    inv = next((x for x in invs if x['invoiceId'] == invoiceId), None)
    if not inv:
        return jsonify({"error": "invoice not found"}), 404
    action = f"Pay invoice {invoiceId}"
    cart = mandate_tool_create(user_id=user_id, mtype='Cart', action=action, amountLimit=inv['amount'], invoiceId=invoiceId)
    # Step B: call payment
    payResp = payment_tool_pay(cart['mandateId'], cart['signedMandate'], invoiceId, paymentMethod='demo-card-xxxx')
    return jsonify({"cart": cart, "payment": payResp})

# Simple health
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"ok": True})

if __name__ == '__main__':
    app.run(port=int(os.environ.get('AGENT_PORT', 5000)), debug=True)
