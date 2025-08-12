import { task } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

task("set-device-contract", "Assigns a Device NFT contract to a project ID")
  .addParam("projectid", "The ID of the project")
  .addParam("device", "The address of the Device NFT contract")
  .setAction(async ({ projectid, device }, hre) => {
    const storeAddress = process.env.IOID_STORE;
    if (!storeAddress) {
      console.error("❌ Missing IOID_STORE address in .env");
      return;
    }

    const [signer] = await hre.ethers.getSigners();
    const Store = await hre.ethers.getContractAt("ioIDStore", storeAddress, signer);

    console.log(`⏳ Associating device contract ${device} with project ID ${projectid}...`);

    try {
      const tx = await Store.setDeviceContract(projectid, device);
      const receipt = await tx.wait();

      console.log(`✅ Device contract set for project ID ${projectid}`);
      console.log(`🔗 Tx hash: ${receipt.hash}`);
    } catch (err) {
      console.error("❌ Failed to set device contract:", err.message || err);
    }
  });