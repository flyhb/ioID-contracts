import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const Wallet = await ethers.getContractFactory("Wallet");
  const walletImpl = await Wallet.deploy();  // No args — we use initialize()
  await walletImpl.waitForDeployment();
  console.log("WALLET_IMPLEMENTATION:", await walletImpl.getAddress());

  const WalletRegistry = await ethers.getContractFactory("WalletRegistry");
  const walletRegistry = await WalletRegistry.deploy();
  await walletRegistry.waitForDeployment();
  console.log("WALLET_REGISTRY:", await walletRegistry.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});