import { deploy } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { MaxUint256 } from 'ethers';
import { ethers, upgrades } from 'hardhat';

/**
 * Simple deployment script for the example DeviceNFT contract.
 *
 * This script deploys the upgradable DeviceNFT contract from the examples folder
 * and optionally configures a minter so that the project owner (or another
 * authorised account) can mint NFTs for new devices. The script requires
 * several environment variables to be set:
 *
 * - DEVICE_NAME: the human‑readable name of your device collection (e.g. "My Device NFT").
 * - DEVICE_SYMBOL: the short symbol for the collection (e.g. "MDN").
 * - DEVICE_MINTER (optional): the address that will be allowed to mint tokens.
 * - DEVICE_MINTER_ALLOWANCE (optional): the number of tokens the minter can mint.
 *
 * When run, the script deploys the proxy, initialises it with the name and symbol,
 * and if a minter is provided, configures the minter allowance. Finally, it
 * prints out the proxy address for the deployed DeviceNFT.
 */
async function main() {
  if (!process.env.DEVICE_NAME || !process.env.DEVICE_SYMBOL) {
    console.log('Please provide DEVICE_NAME and DEVICE_SYMBOL in your environment');
    return;
  }
  const name = process.env.DEVICE_NAME;
  const symbol = process.env.DEVICE_SYMBOL;

  const deployer = (await ethers.getSigners())[0];
  console.log(`Deploying DeviceNFT with deployer: ${deployer.address}`);

  const DeviceNFT = await ethers.getContractFactory('DeviceNFT');
  // Deploy the proxy and initialise it with name and symbol
  const deviceNFT = await upgrades.deployProxy(DeviceNFT, [], { initializer: false });
  await deviceNFT.waitForDeployment();
  // Call initialize manually with name and symbol
  const txInit = await deviceNFT.initialize(name, symbol);
  await txInit.wait();

  console.log(`DeviceNFT deployed to ${deviceNFT.target}`);

  // Optionally configure a minter and allowance. If DEVICE_MINTER_ALLOWANCE is
  // undefined the allowance will default to zero. Note that configureMinter is
  // only callable by the contract owner (the deployer).
  const minter = process.env.DEVICE_MINTER || deployer.address;
  const allowanceEnv = process.env.DEVICE_MINTER_ALLOWANCE;
  if (minter) {
    // If not set allow the maximum possible number for uint256, which is 2^256 - 1.
    const allowance = allowanceEnv ? BigInt(allowanceEnv) : BigInt(MaxUint256)
    const tx = await deviceNFT.configureMinter(minter, allowance);
    await tx.wait();
    console.log(`Configured minter ${minter} with allowance ${allowance.toString()}`);
  }

  // If a projectId is provided, link the device contract to your project. This
  // tells the ioIDStore that this ERC721 belongs to a specific project and
  // enables device registration for tokens minted from this contract. The
  // PROJECT_ID variable should contain a decimal string representing the
  // project's tokenId in ProjectRegistry. Linking must be performed by the
  // project owner.
  const projectIdEnv = process.env.PROJECT_ID;
  if (projectIdEnv) {
    if (!process.env.IOID_STORE) {
      console.log('IOID_STORE must be provided to link the device contract');
    } else {
      const projectId = BigInt(projectIdEnv);
      const ioIDStore = await ethers.getContractAt('ioIDStore', process.env.IOID_STORE);
      const txLink = await ioIDStore.setDeviceContract(projectId, deviceNFT.target);
      await txLink.wait();
      console.log(`Linked DeviceNFT ${deviceNFT.target} to project ${projectId.toString()}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});