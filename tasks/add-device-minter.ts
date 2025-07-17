import { task } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

task("add-device-minter", "Grants minter rights to an address on a DeviceNFT contract")
  .addParam("contract", "The address of the deployed DeviceNFT contract")
  .addParam("minter", "The address to configure as minter")
  .addParam("amount", "The number of NFTs this minter is allowed to mint")
  .setAction(async ({ contract, minter, amount }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const DeviceNFT = await hre.ethers.getContractAt("DeviceNFT", contract, signer);

    console.log(`⚙️  Configuring minter: ${minter} (allowance: ${amount})`);

    try {
      const tx = await DeviceNFT.configureMinter(minter, amount);
      const receipt = await tx.wait();

      console.log(`✅ Minter configured! Tx hash: ${receipt.hash}`);
    } catch (err) {
      console.error("❌ Failed to configure minter:", err.message || err);
    }
  });