
const hre = require("hardhat");
const fs= require('fs')

const marketplaceOwner = process.env.PUBLIC_KEY;
const disputeNFTMarketAddress = '0xdcab8c7b03964d25952b539d95deef2b14c49f30';

async function main() {

  const disputeNFTFactory = await hre.ethers.getContractFactory("DisputeNFT");
  const disputeNFT = await disputeNFTFactory.deploy(disputeNFTMarketAddress)
  await disputeNFT.deployed();
  console.log("DisputeNFT deployed to:", disputeNFT.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
