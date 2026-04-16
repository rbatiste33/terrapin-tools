# Terrapin Privacy Manifesto

## The Promise

Terrapin will always run local models. Always stay on your hardware. Always keep your data yours.

We will never:
- Connect to cloud AI models with your business data
- Store your information on our servers
- Sell your data to anyone
- Allow third party agents to access your tools or profile
- Phone home with your usage or behavior
- Change this. Ever.

We will always:
- Run AI locally on your machine
- Keep your business profile on your hardware
- Use open source local models — Gemma, Llama, Mistral, whatever runs best locally
- Give you full access to every file Terrapin creates
- Let you delete everything with one command
- Be honest about what we are and what we aren't

## Why This Matters

Every AI company tells you they respect your privacy. Then they train on your data. Then they get acquired. Then the terms of service change.

We're not building a cloud product that handles your data carefully. We're building a product where your data never leaves your machine in the first place. There's nothing to leak. Nothing to breach. Nothing to sell.

Your invoice data is on your computer.
Your client list is on your computer.
Your business profile is on your computer.
Your AI brain is on your computer.

We never see any of it.

## How We Make Money

The core tool library is free. Always. No login, no account, no subscription.

If you want a premium tool — Invoice Follow-Up Generator, Review Response Generator, Customer Email Response Generator — you pay once and own it forever. No recurring charges. No auto-renew. No "upgrade to keep using the tool you already paid for."

We make money from one-time tool purchases and tool sponsorships — not from your data. That alignment matters. When companies make money from data they have an incentive to collect more of it. We chose the harder business model on purpose.

## On Cloud Agents

Terrapin will never integrate with cloud AI agents or allow cloud models to access your local tools or data. No OpenAI. No Anthropic API calls with your business data. No Google Gemini in the cloud. No exceptions.

If you want to use Terrapin with an AI agent it runs locally. Gemma. Llama. Mistral. Whatever open model runs on your hardware. The agent lives on your machine the same way the tools do.

This limits some capabilities. We accept that tradeoff completely.

## The Technical Reality

When Terrapin is fully agentic:
- Gemma E4B runs on localhost via Ollama
- The agent server runs on localhost
- The mail server sends through your own Gmail account
- tools.json lives on your machine
- business.md lives on your machine
- Every tool output stays on your machine

The only internet activity:
- Downloading software during initial setup
- Sending emails through your own email account
- One-time payment if you choose to buy a premium tool

That's it. Everything else is local. Everything else is yours.

## This Is The Shell

The turtle carries everything on its back. That's not just a brand metaphor. That's the architecture. Your business data lives on your machine the way a turtle's home lives on its back. It goes where you go. It belongs to you. Nobody can take it.

Tantalizing terrapin terraforming agentic planetary contributions — locally, privately, always.
