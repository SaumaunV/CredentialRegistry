const hre = require("hardhat")

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    const Credentials  = await hre.ethers.getContractFactory("CredentialRegistry");
    // deploy contracts
    const credential  = await Credentials.deploy(deployer.address);
    await credential.waitForDeployment();
    console.log("Credentials deployed to: ", await credential.getAddress());
    const contractAddress  = await credential.getAddress();
    saveFrontendFiles(contractAddress  , "CredentialRegistry");
}

function saveFrontendFiles(contractAddress, name) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../src/contractsData";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }
  
  fs.writeFileSync(
    contractsDir + `/${name}-address.json`,
    JSON.stringify({ address: contractAddress }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(contractArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
