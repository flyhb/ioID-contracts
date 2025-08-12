import { task } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

task("mint-device", "Mints a Device NFT to a given address")
  .addParam("contract", "The address of the DeviceNFT contract")
  .addParam("to", "The address to mint the Device NFT to")
  .setAction(async ({ contract, to }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const DeviceNFT = await hre.ethers.getContractAt("DeviceNFT", contract, signer);

    console.log(`⏳ Minting device NFT to ${to} from signer ${signer.address}...`);

    try {
      const tx = await DeviceNFT.mint(to);
      const receipt = await tx.wait();

      console.log(`✅ Minted! Tx hash: ${receipt.hash}`);
    } catch (err) {
      console.error("❌ Minting failed:", err.message || err);
    }
  });