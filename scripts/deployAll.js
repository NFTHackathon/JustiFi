
const hre = require("hardhat");
const fs= require('fs')

const marketplaceOwner = process.env.PUBLIC_KEY;

async function main() {

  const disputeNFTMarketFactory = await hre.ethers.getContractFactory("DisputeNFTMarket");
  const disputeMarket = await disputeNFTMarketFactory.deploy(marketplaceOwner);
  await disputeMarket.deployed();

  const disputeNFTFactory = await hre.ethers.getContractFactory("DisputeNFT");
  const disputeNFT = await disputeNFTFactory.deploy(disputeMarket.address)
  await disputeNFT.deployed();

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(disputeMarket.address, marketplaceOwner);
  await escrow.deployed();

  console.log("DisputeNFT deployed to:", disputeNFTMarket.address);
  console.log("DisputeNFT deployed to:", disputeNFT.address);
  console.log("DisputeNFT deployed to:", escrow.address);

  let config =`
  export const disputeNFTMarket = '${disputeNFTMarket.address}'
  export const disputeNFT = '${disputeNFT.address}'
  export const escrow ='${escrow.address}'`

  let data = JSON.stringify(config)
  fs.writeFileSync('config.js', JSON.parse(data))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
