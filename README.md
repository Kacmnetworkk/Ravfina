# Ravfina

Ravfina is an institutional treasury and financial platform: wallet
overview, cards management, loans and funding, an underwriting engine,
FX reconciliation, ERP/API integrations, and security and fraud tooling,
built with React 19, Vite, Tailwind CSS 4, and TypeScript.

## Solana lending (Ravfia Lending, devnet)

Ravfina's Loans & Funding view has a "Solana Settlement (Devnet)" tab
that wires the app to Ravfia Lending on Solana devnet:

- `src/lib/ravfia-lending/` mirrors the constants and guard logic of the
  `@ravfia/lending-services` package: the RUSD mint, both `loan_servicing`
  program deployments, and the Ravfia lender wallet. The config is
  devnet-only — mainnet clusters and RPC endpoints throw.
- The browser client is read-only. It uses plain JSON-RPC `fetch` (no
  Solana dependency) to read the RUSD mint supply and the lender wallet's
  SOL and RUSD balances. It never signs or sends a transaction.
- The disbursement planner produces operator steps only, mirroring the
  Embedded Finance playbook's `planDisbursement`. Signing and submission
  happen outside this app.
- The on-chain program and the full services package live in
  kurtmorales-tech/solana-lending. Ravfia is the lender of record.
- Presentation name: the token is presented as Ravfia Coin (RVCN), with
  the coin image and metadata hosted in the public
  kurtmorales-tech/ravfia-token repo (metadata:
  https://raw.githubusercontent.com/kurtmorales-tech/ravfia-token/main/metadata.json).
  The rename is presentation only — the mint was issued as Ravfia USD
  (RUSD) and its details (mint, 6 decimals, supply) are unchanged.

Devnet only — no real funds, not audited, no live lending.

The devnet RPC endpoint defaults to `https://api.devnet.solana.com` and
can be overridden with the `VITE_SOLANA_RPC_URL` environment variable
(see `.env.example`). Mainnet endpoints are refused.
