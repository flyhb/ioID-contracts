import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying DeviceNFT via proxy with account:", deployer.address);

  const DeviceNFT = await ethers.getContractFactory("DeviceNFT");
  const proxy = await upgrades.deployProxy(DeviceNFT, ["DroneDevice", "DRONE"], {
    initializer: "initialize",
  });

  await proxy.waitForDeployment();

  const address = await proxy.getAddress();
  console.log("✅ DeviceNFT proxy deployed to:", address);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});