import { ethers, upgrades } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress(), 'on chain', (await ethers.provider.getNetwork()).chainId);

  // Assumes contracts/wallet/HBAccount.sol exists in your repo
  const HBAccount = await ethers.getContractFactory('HBAccount');
  const acct = await HBAccount.deploy();
  await acct.waitForDeployment();

  const addr = await acct.getAddress();
  console.log('HBAccount deployed at:', addr);

  // Quick capability sanity check
  const iERC165 = new ethers.Interface(['function supportsInterface(bytes4) view returns (bool)']);
  const data = iERC165.encodeFunctionData('supportsInterface', ['0x150b7a02']);
  try {
    const ret = await ethers.provider.call({ to: addr, data });
    const [ok] = iERC165.decodeFunctionResult('supportsInterface', ret);
    console.log('supports ERC721Receiver (0x150b7a02):', ok);
  } catch {
    console.log('supportsInterface call failed (but HBAccount should inherit ERC721Holder).');
  }

  console.log('\nSet WALLET_IMPLEMENTATION in your .env to:', addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});