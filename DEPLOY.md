# Deploy ioID to an EVM chain

## Clone and install
```sh
git clone https://github.com/flyhb/ioID-contracts.git
cd ioID-contracts
npm install
```

## Add your network to Hardhat (e.g. Ethereum Sepolia)

In `hardhat.config.ts`, add this under `networks`:
```js
ethereum-sepolia: {
      url: ' https://sepolia.infura.io/v3/',
      accounts: accounts,
    }
```

## Create your `.env`
Use ETH (decimal) for IOID_PRICE. Ethereum already has the canonical 6551 contracts.

```sh
cp .env.example .env
# then edit .env with your private key (burner for testnets) and any tweaks you need
```

`.env.example`:

```sh
# --- Wallet / Network ---
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL_BEPO=https://bepolia.rpc.berachain.com

# --- ioID Deploy Params ---
IOID_PRICE=0.01

# ERC-6551 (Tokenbound) registry, defaults to canonical address
WALLET_REGISTRY=0x000000006551c19487814612e58FE06813775758
# ERC-6551 (Tokenbound) wallet implemenation
# Run npx hardhat run scripts/deploy-wallet.ts to deploy mock/HBWallet.sol example
# Defaults to canonical address
WALLET_IMPLEMENTATION=0x55266d75D1a14E4572138116aF39863Ed6596E7F

# --- Optional: explorer verification (if supported) ---
# ETHERSCAN_API_KEY=
```

## Compile contracts
```sh
npx hardhat compile
```

## Deploy the ioID suite
This runs `scripts/deploy.ts`, wires everything up (Project, ProjectRegistry, ioIDStore, ioID, ioIDRegistry), and outputs `chain-name.md` under `chain-deployments`:

```sh
npx hardhat run scripts/deploy.ts --network ethereum-sepolia
```

# Optional: Deploy factory/proxy for centralized onboarding
If you want a project-managed (proxy) flow too:

```sh
export IOID_STORE=0x<ioIDStore_from_step_5>
export PROJECT_REGISTRY=0x<ProjectRegistry_from_step_5>

npx hardhat run scripts/deploy-factory-v2.ts --network bepolia
```

# Notes
- For `IOID_PRICE` **use ETH** (e.g. 0.01), not wei.
- Use the canonical ERC-6551 addresses, if they are not deployed to your chain, deploy according to tokenbound accounts [official doc](https://docs.tokenbound.org/guides/deploy-registry).
