const hre = require("hardhat");
const fs= require('fs')

const marketplaceOwner = process.env.PUBLIC_KEY;


async function main() {
  const disputeNFTMarketFactory = await hre.ethers.getContractFactory("DisputeNFTMarket");
  const disputeMarket = await disputeNFTMarketFactory.deploy(marketplaceOwner);
  await disputeMarket.deployed();
  console.log("DisputeNFTMarket deployed to:", disputeMarket.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
