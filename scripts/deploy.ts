import { ethers, upgrades } from 'hardhat';

async function main() {
  // ioID token price must be provided via the IOID_PRICE env var. Without
  // this the deployment script cannot determine the minting cost. Exit
  // early with a helpful message if it's missing.
  if (!process.env.IOID_PRICE) {
    console.log(`Please provide IOID_PRICE`);
    return;
  }
  // Use the canonical ERC‑6551 registry on Berachain Bepolia by default. The
  // deployed registry lives at a deterministic address across all chains. See
  // https://tokenbound.org for details. Fallback to the provided
  // WALLET_REGISTRY environment variable if set.
  const DEFAULT_REGISTRY = '0x000000006551c19487814612e58FE06813775758';
  const walletRegistry = process.env.WALLET_REGISTRY || DEFAULT_REGISTRY;

  // The ERC‑6551 account implementation address must also be set via the
  // WALLET_IMPLEMENTATION env var. Without this we cannot initialize
  // ioID contracts correctly.
  if (!process.env.WALLET_IMPLEMENTATION) {
    console.log(`Please provide WALLET_IMPLEMENTATION`);
    return;
  }
  const walletImplementation = process.env.WALLET_IMPLEMENTATION;

  const [deployer] = await ethers.getSigners();

  const project = await upgrades.deployProxy(await ethers.getContractFactory('Project'), ['ioID Project', 'IPN'], {
    initializer: 'initialize',
  });
  await project.waitForDeployment();
  console.log(`Project deployed to ${project.target}`);
  const projectRegistry = await upgrades.deployProxy(
    await ethers.getContractFactory('ProjectRegistry'),
    [project.target],
    {
      initializer: 'initialize',
    },
  );
  await projectRegistry.waitForDeployment();
  console.log(`ProjectRegistry deployed to ${projectRegistry.target}`);

  console.log(`Set Project minter to ${projectRegistry.target}`);
  let tx = await project.setMinter(projectRegistry.target);
  await tx.wait();

  const ioIDStore = await upgrades.deployProxy(
    await ethers.getContractFactory('ioIDStore'),
    [project.target, ethers.parseEther(process.env.IOID_PRICE)],
    {
      initializer: 'initialize',
    },
  );
  await ioIDStore.waitForDeployment();
  console.log(`ioIDStore deployed to ${ioIDStore.target}`);

  const ioID = await upgrades.deployProxy(
    await ethers.getContractFactory('ioID'),
    [deployer.address, walletRegistry, walletImplementation, 'ioID device NFT', 'IDN'],
    {
      initializer: 'initialize',
    },
  );
  await ioID.waitForDeployment();
  console.log(`ioID deployed to ${ioID.target}`);

  const ioIDRegistry = await upgrades.deployProxy(
    await ethers.getContractFactory('ioIDRegistry'),
    [ioIDStore.target, ioID.target],
    {
      initializer: 'initialize',
    },
  );
  console.log(`ioIDRegistry deployed to ${ioIDRegistry.target}`);

  console.log(`Set ioIDStore ioIDRegistry to ${ioIDRegistry.target}`);
  tx = await ioIDStore.setIoIDRegistry(ioIDRegistry.target);
  await tx.wait();

  console.log(`Set ioID minter to ${ioIDRegistry.target}`);
  tx = await ioID.setMinter(ioIDRegistry.target);
  await tx.wait();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
