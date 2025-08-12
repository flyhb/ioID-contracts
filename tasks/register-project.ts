import { task } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

task("register-project", "Registers a new project with a name (owner is deployer)")
  .addParam("name", "The name of the project")
  .setAction(async ({ name }, hre) => {
    const registryAddress = process.env.PROJECT_REGISTRY;
    if (!registryAddress) {
      console.error("❌ Missing PROJECT_REGISTRY in .env");
      return;
    }

    const [deployer] = await hre.ethers.getSigners();
    const ProjectRegistry = await hre.ethers.getContractAt("ProjectRegistry", registryAddress, deployer);

    console.log(`⏳ Registering project "${name}" as: ${deployer.address}`);

    // Call the overloaded function explicitly
    const tx = await ProjectRegistry["register(string)"](name);
    const receipt = await tx.wait();

    // Manually find and decode the Transfer event (ERC721)
    const transferTopic = hre.ethers.id("Transfer(address,address,uint256)");

    const transferLog = receipt.logs.find(log => log.topics[0] === transferTopic);

    let projectId = "(unknown)";
    if (transferLog) {
      const tokenIdHex = transferLog.topics[3];
      projectId = hre.ethers.toBigInt(tokenIdHex).toString();
    }

    console.log(`✅ Project registered! ID: ${projectId}`);
    console.log(`🔗 Tx hash: ${receipt.hash}`);
  });