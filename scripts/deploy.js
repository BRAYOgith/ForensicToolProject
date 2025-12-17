const hre = require("hardhat");

async function main() {
  const EvidenceStorage = await hre.ethers.getContractFactory("EvidenceStorage");
  const evidenceStorage = await EvidenceStorage.deploy();
  await evidenceStorage.waitForDeployment(); // Wait for deployment
  console.log("EvidenceStorage deployed to:", await evidenceStorage.getAddress()); // Get the deployed address
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});