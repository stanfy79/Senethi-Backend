# Keeper Agent Backend

A backend-first AI onchain execution runtime.

The frontend is intentionally separate.

## What this backend does

- Natural-language task planning
- Real KeeperHub execution
- ERC20/native transfers
- Smart-contract calls
- KeeperHub DeFi protocol actions through MCP
- Preflight simulation before broadcast
- Idempotent execution
- Execution status polling
- Real transaction hashes
- Multi-step agent plans

## Critical architecture

```text
Frontend / API Client
        |
        v
POST /v1/agent/execute
        |
        v
Agent planner
        |
        v
Structured actions
        |
        +-----------------------+
        |                       |
        v                       v
 Direct transfer/call       DeFi protocol
        |                       |
        v                       v
 KeeperHub REST API       KeeperHub MCP
        |                       |
        +-----------+-----------+
                    |
                    v
               Blockchain
```

**No backend code signs blockchain transactions itself.**

KeeperHub is the execution layer.

## 1. Prerequisites

You need:

1. A KeeperHub organization.
2. An organization API key beginning with `kh_`.
3. A configured KeeperHub wallet integration.
4. Testnet funds in the configured KeeperHub wallet.
5. Node.js 20+.

KeeperHub's direct execution API requires an organization API key. Write actions require a wallet integration.

## 2. Install

```bash
npm install
cp .env.example .env
```

Set:

```env
KEEPERHUB_API_KEY=kh_...
OPENAI_API_KEY=sk-...
DEFAULT_CHAIN_ID=11155111
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

If you only want to test direct transfers, `OPENAI_API_KEY` is optional.

## 3. Check KeeperHub

```bash
npm run dev
```

Then:

```bash
curl http://localhost:4000/health/keeperhub
```

This verifies the KeeperHub API and MCP connection and lists available chains/tools.

Check the wallet:

```bash
curl http://localhost:4000/keeperhub/wallet
```

## 4. Execute a real testnet transfer

Use a test recipient you control.

```bash
curl -X POST http://localhost:4000/v1/actions/transfer \
  -H "content-type: application/json" \
  -d '{
    "taskId": "demo-transfer-001",
    "chainId": 11155111,
    "recipientAddress": "0xYOUR_TEST_ADDRESS",
    "amount": "0.001"
  }'
```

The backend follows KeeperHub's documented safe sequence:

1. simulate
2. stop if simulation would revert
3. broadcast with a stable idempotency key
4. poll execution status
5. return KeeperHub's verified transaction data

For ERC20:

```json
{
  "taskId": "demo-usdc-001",
  "chainId": 11155111,
  "recipientAddress": "0xYOUR_TEST_ADDRESS",
  "amount": "1",
  "tokenAddress": "0xYOUR_TESTNET_TOKEN"
}
```

## 5. Natural-language agent

With `OPENAI_API_KEY` configured:

```bash
curl -X POST http://localhost:4000/v1/agent/execute \
  -H "content-type: application/json" \
  -d '{
    "taskId": "agent-demo-001",
    "message": "Send 0.001 ETH to 0xYOUR_TEST_ADDRESS"
  }'
```

The LLM produces a structured action. The backend validates it and KeeperHub performs the transaction.

## 6. Swaps

Swaps are not hard-coded to an invented router.

KeeperHub exposes:

- `search_protocol_actions`
- `execute_protocol_action`

The backend uses MCP for DeFi protocol discovery and execution.

The intended flow is:

```text
"Swap 1 USDC for ETH"
        |
        v
LLM plan
        |
        v
KeeperHub search_protocol_actions
        |
        v
actual supported action + schema
        |
        v
KeeperHub execute_protocol_action
        |
        v
real transaction
```

Before enabling a particular swap in production, inspect the returned KeeperHub action schema for the selected chain/protocol and pass its exact required inputs.

## 7. Important

The backend does not pretend a transaction succeeded.

A successful result should contain:

- KeeperHub execution ID
- status
- transaction hash
- transaction link when available
- receipt verification
- gas usage when available

If KeeperHub simulation fails, no transaction is broadcast.

## 8. Frontend contract

The future frontend only needs these endpoints:

### POST `/v1/agent/plan`

```json
{
  "message": "Send 1 USDC to 0x..."
}
```

### POST `/v1/agent/execute`

```json
{
  "taskId": "unique-task-id",
  "message": "Send 1 USDC to 0x..."
}
```

### POST `/v1/actions/transfer`

Direct execution endpoint for deterministic testing.

### POST `/v1/actions/contract-call`

For generic contract interactions.

### GET `/v1/actions/:executionId`

For execution polling.

### GET `/health/keeperhub`

Backend/KeeperHub diagnostics.

## Security

Never put `KEEPERHUB_API_KEY` in the frontend.

The frontend talks to this backend.

The backend talks to KeeperHub.

Do not add a direct viem/ethers transaction signer to this project. KeeperHub is intentionally the only write execution layer.
