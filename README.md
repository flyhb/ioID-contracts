# ioID - Decentralized Device Identity Manager

**ioID** is an on‑chain device identity and ownership system developed by **IoTeX** (forked from [iotexproject/ioID-contracts](https://github.com/iotexproject/ioID-contracts)). It lets a device and its owner hold a verifiable identity (DID), own assets on-chain, and control a token‑bound wallet.  

This repository primarily **cleans up tests and documentation** to make it easier for projects to integrate their own device NFT collections with ioID.

> Chain Deployment addresses have been moved into `chain-deployments/` (one file per network).

---

## Running the tests

```bash
# From ioID-contracts
npm install
npx hardhat compile

# Centralized / proxy flow (project-managed registration)
npx hardhat test test/flow-virtual.test.ts

# Decentralized / owner self-registration
npx hardhat test test/flow-direct-register.test.ts
```

**What the tests demonstrate (briefly):**
- **flow-virtual**: a project-controlled **Proxy** registers a device, receives the ioID NFT, then transfers it to the intended owner. Handy for “managed” onboarding.
- **flow-direct-register**: the **owner** registers directly using the device’s EIP‑712 **Permit**; the registry mints the ioID, creates the token‑bound wallet, and **pulls the Device NFT** into that wallet (ensure the owner approved the registry to transfer the NFT first).

> Tests use **local ERC‑6551 mocks** purely for fast local runs. In production, point to the **canonical ERC‑6551 registry** on your target chain.

## Integrating your devices

See [INTEGRATE.md](./INTEGRATE.md)

## Deploying ioID

See [DEPLOY.md](./DEPLOY.md)
