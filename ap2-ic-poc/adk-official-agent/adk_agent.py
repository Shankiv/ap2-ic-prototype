# adk_agent.py - minimal ADK SDK style agent (requires google ADK SDK to be installed)
# NOTE: This is a template; install official ADK (per https://google.github.io/adk-docs/) to run.
from adk import Agent, Tool, Runner
import requests
import os

BACKEND = os.environ.get('BACKEND_URL','http://localhost:3000')

class InvoiceTool(Tool):
    def run(self, user_id: str):
        r = requests.get(f"{BACKEND}/api/invoices/open")
        r.raise_for_status()
        return r.json()

class MandateTool(Tool):
    def run(self, payload: dict):
        r = requests.post(f"{BACKEND}/api/mandates", json=payload)
        r.raise_for_status()
        return r.json()

class PaymentTool(Tool):
    def run(self, payload: dict):
        r = requests.post(f"{BACKEND}/api/pay", json=payload)
        r.raise_for_status()
        return r.json()

# Agent definition
agent = Agent(
    id="ic-adk-agent",
    name="IC ADK Agent",
    tools=[InvoiceTool(name='invoice_tool'), MandateTool(name='mandate_tool'), PaymentTool(name='payment_tool')]
)

if __name__ == '__main__':
    runner = Runner(agent)
    runner.run()
