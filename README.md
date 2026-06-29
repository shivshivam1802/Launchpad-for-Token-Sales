# Web3 Token Launchpad Platform (similar to CoinList & PinkSale)

A production-ready, audited, high-fidelity Web3 Token Launchpad Platform built for project founders to launch token sales (IDO/ICO), raise capital securely, and automate post-TGE vesting schedules. Features a sleek glassmorphic dark theme.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Wagmi & Viem, Tailwind CSS, Framer Motion
- **Backend**: NestJS, Prisma ORM, Ethers.js
- **Smart Contracts**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **Database & Services**: PostgreSQL, Docker, Docker Compose

---

## Directory Architecture

```
launchpad-monorepo/
├── contracts/          # Solidity Smart Contracts (Hardhat compilation/testing)
├── backend/            # NestJS REST & Sync Indexer API + Prisma models
├── frontend/           # Next.js 15 App Client (Glassmorphism Web3 Dashboard)
├── docker-compose.yml  # Local postgres + node docker orchestration
└── package.json        # npm monorepo workspaces configuration
```

---

## Smart Contract Deployments

The following contracts are compiled, verified, and test-covered under `contracts/`:
1. `LaunchpadFactory.sol`: Spawns individual IDO contracts.
2. `TokenSale.sol`: Manages limits, rates, whitelists, soft/hard caps.
3. `Vesting.sol`: Releases buyer allocations according to custom daily/weekly/monthly schedules.
4. `Staking.sol`: Locks `$LAUNCH` tokens to reward users and determine their allocation Tiers.
5. `Referral.sol`: Computes multi-level commissions (5% Level 1, 2% Level 2).
6. `Governance.sol`: Multi-tier DAO proposal and voting weight evaluation.
7. `Treasury.sol` & `MultiSigWallet.sol`: Gated admin fund storage and consensus.

---

## Setup & Running Locally

### 1. Smart Contract testing & node
```bash
# Install root workspace dependencies
npm install

# Test smart contracts
npm run contracts:test

# Spin up a local Ethereum JSON-RPC node
cd contracts
npx hardhat node
```

### 2. Database & Backend API Setup
In another terminal, configure the environment and run migrations:
```bash
# Generate Prisma Client & sync cache models
cd backend
npm run prisma:generate
npm run prisma:migrate

# Start NestJS REST server
npm run start:dev
```

### 3. Frontend App Client
```bash
# Run Next.js server on port 3000
cd frontend
npm run dev
```

### 4. Running via Docker Compose
To run PostgreSQL, Hardhat, Backend, and Frontend in unified network containers:
```bash
docker-compose up --build
```
Once initialized:
- Frontend runs at: `http://localhost:3000`
- REST Backend runs at: `http://localhost:3001/api`
- Hardhat network RPC is available at: `http://localhost:8545`

---

## Wallet Configuration

For local UI testing, connect MetaMask to your local Hardhat node:
- **Network Name**: Hardhat Local
- **New RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

Import the local development deployer private key (provided by `npx hardhat node` logs) into MetaMask to receive 10,000 test ETH for sandbox operations.
