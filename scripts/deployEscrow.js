const hre = require("hardhat");
const fs= require('fs')

const marketplaceOwner = process.env.PUBLIC_KEY;
const disputeMarketAddress = '0xdcab8c7b03964d25952b539d95deef2b14c49f30';

async function main() {

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(disputeMarketAddress, marketplaceOwner);
  await escrow.deployed();

  console.log("Escrow deployed to:", escrow.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
