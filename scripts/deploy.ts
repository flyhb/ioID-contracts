// Deploy ioID suite and emit a Markdown summary under chain-deployments/<network>.md
// Usage: npx hardhat run scripts/deploy.ts --network <network>
// Env:
//   IOID_PRICE=0.01            // ETH (parsed with parseEther)
//   WALLET_REGISTRY=0x...      // ERC-6551 registry (defaults to Tokenbound canonical)
//   WALLET_IMPLEMENTATION=0x...// ERC-6551 account implementation (Tokenbound proxy impl)
//   CHAIN_NAME=Bepolia         // Optional pretty title for markdown
//
// Notes:
// - Uses OZ upgrades proxies; we disable auto-initializer and call initialize() manually.
// - Summary file prints addresses in `Name:0x...` style and includes ioID price.

import 'dotenv/config';
import { ethers, upgrades } from 'hardhat';
import fs from 'fs';
import path from 'path';
import hre from 'hardhat';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`Missing ${name} in .env`);
  return v.trim();
}

function toTitle(s: string) {
  if (!s) return s;
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function writeChainMarkdown(params: {
  networkFileName: string;
  chainTitle: string;
  erc6551Registry: string;
  erc6551Implementation: string;
  project: string;
  projectRegistry: string;
  ioIDStore: string;
  ioID: string;
  ioIDRegistry: string;
  ioidPriceEth: string;
}) {
  const outDir = path.join(__dirname, '..', 'chain-deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${params.networkFileName}.md`);

  const md = `### ${params.chainTitle}

1. ERC6551 contracts

\`\`\`
ERC6551Registry:${params.erc6551Registry}
ERC6551Wallet:${params.erc6551Implementation}
\`\`\`

2. ioID contracts

\`\`\`
Project:${params.project}
ProjectRegistry:${params.projectRegistry}
ioIDStore:${params.ioIDStore}
ioID:${params.ioID}
ioIDRegistry:${params.ioIDRegistry}
ioIDPrice(ETH):${params.ioidPriceEth}
\`\`\`
`;

  fs.writeFileSync(outPath, md);
  console.log(`\n📝 Wrote ${outPath}\n`);
  console.log(md);
}

async function main() {
  // Sanity: signer
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No signer found. Check PRIVATE_KEY and network accounts[].');
  console.log('Deployer:', await deployer.getAddress());

  // Required env
  const IOID_PRICE = requireEnv('IOID_PRICE'); // decimal ETH
  const DEFAULT_REGISTRY = '0x000000006551c19487814612e58FE06813775758';
  const DEFAULT_IMPLEMENTATION = '0x55266d75D1a14E4572138116aF39863Ed6596E7F';
  const WALLET_REGISTRY = (process.env.WALLET_REGISTRY || DEFAULT_REGISTRY).trim();
  const WALLET_IMPLEMENTATION = (process.env.WALLET_IMPLEMENTATION || DEFAULT_IMPLEMENTATION).trim();

  // Deploy Project
  const Project = await ethers.getContractFactory('Project');
  const project = await upgrades.deployProxy(Project, [], { initializer: false });
  await project.waitForDeployment();
  await (await project.initialize('ioID Project', 'IPN')).wait();
  console.log('Project at', await project.getAddress());

  // Deploy ProjectRegistry
  const ProjectRegistry = await ethers.getContractFactory('ProjectRegistry');
  const projectRegistry = await upgrades.deployProxy(ProjectRegistry, [], { initializer: false });
  await projectRegistry.waitForDeployment();
  await (await projectRegistry.initialize(await project.getAddress())).wait();
  await (await project.setMinter(await projectRegistry.getAddress())).wait();
  console.log('ProjectRegistry at', await projectRegistry.getAddress());

  // Deploy ioIDStore
  const IoIDStore = await ethers.getContractFactory('ioIDStore');
  const ioIDStore = await upgrades.deployProxy(IoIDStore, [], { initializer: false });
  await ioIDStore.waitForDeployment();
  await (await ioIDStore.initialize(await project.getAddress(), ethers.parseEther(IOID_PRICE))).wait();
  console.log('ioIDStore at', await ioIDStore.getAddress());

  // Deploy ioID (core)
  const IOID = await ethers.getContractFactory('ioID');
  const ioID = await upgrades.deployProxy(IOID, [], { initializer: false });
  await ioID.waitForDeployment();
  await (
    await ioID.initialize(
      await deployer.getAddress(),
      WALLET_REGISTRY,
      WALLET_IMPLEMENTATION,
      'ioID device NFT',
      'IDN'
    )
  ).wait();
  console.log('ioID at', await ioID.getAddress());

  // Deploy ioIDRegistry
  const IOIDRegistry = await ethers.getContractFactory('ioIDRegistry');
  const ioIDRegistry = await upgrades.deployProxy(IOIDRegistry, [], { initializer: false });
  await ioIDRegistry.waitForDeployment();
  await (await ioIDRegistry.initialize(await ioIDStore.getAddress(), await ioID.getAddress())).wait();
  console.log('ioIDRegistry at', await ioIDRegistry.getAddress());

  // Wire permissions
  await (await ioIDStore.setIoIDRegistry(await ioIDRegistry.getAddress())).wait();
  await (await ioID.setMinter(await ioIDRegistry.getAddress())).wait();
  console.log('Wired store↔registry and set ioID minter.');

  // Summary markdown
  const networkFileName = hre.network.name; // e.g., "berachain"
  const chainTitle = toTitle(process.env.CHAIN_NAME || networkFileName);
  writeChainMarkdown({
    networkFileName,
    chainTitle,
    erc6551Registry: WALLET_REGISTRY,
    erc6551Implementation: WALLET_IMPLEMENTATION,
    project: await project.getAddress(),
    projectRegistry: await projectRegistry.getAddress(),
    ioIDStore: await ioIDStore.getAddress(),
    ioID: await ioID.getAddress(),
    ioIDRegistry: await ioIDRegistry.getAddress(),
    ioidPriceEth: IOID_PRICE,
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
