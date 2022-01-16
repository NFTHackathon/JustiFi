import {ethers} from 'ethers';
import {useEffect, useState} from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal'
import {disputeNFT, disputeNFTMarket, escrow} from '../config.js'
import Escrow from '../artifacts/contracts/Escrow.sol/Escrow.json'
import DisputeNFT from '../artifacts/contracts/DisputeNFT.sol/DisputeNFT.json'
import DisputeNFTMarket from '../artifacts/contracts/DisputeNFTMarket.sol/DisputeNFTMarket.json'
import {useMoralis} from 'react-moralis';


export default function ClaimFundBuyer() {
  const [nft, setNFT]= useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const { authenticate, enableWeb3, isAuthenticated, logout, user, account } = useMoralis();

  useEffect(async () => {
    const authAndEnable = async () => {
      try {
        await enableWeb3();
      } catch (e) {
        console.log(e);
      }
      
    };

    if (isAuthenticated) {
      authAndEnable();
    }
    await loadNFTdata()
  },[]);

  //function to display minted but unsold NFTs
  async function loadNFTdata() {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const tokenContract = new ethers.Contract(disputeNFT, DisputeNFT.abi, provider)
    const marketContract = new ethers.Contract(disputeNFTMarket, DisputeNFTMarket.abi, provider)
    const data = await marketContract.fetchResolvedNFT()
    // get token data of listed tokens
    const items = await Promise.all(data.map(async i => {
      // tokenUri is a json format containing metadata - image, description, characteristics
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      let item;
      try{
        const meta = await axios.get(tokenUri)
        let price = ethers.utils.formatUnits(i.price.toString(), 18);
        item = {
          price, 
          tokenId: i.tokenId.toNumber(),
          itemId: i.itemId.toNumber(),
          seller: i.seller,
          buyer: i.buyer,
          purchasedNFT: i.purchasedNFT,
          status: i.status,
          ruling: i.ruling,
          image: meta.data.image,
          title: meta.data.title,
          description: meta.data.description
          }
          return item;
        } catch(err) {
          item = ''
          console.log('IPFS request failed', err)
        }
      }))
    console.log(items)
    setNFT(items)
    setLoadingState('loaded')
  }

  async function handleClaimFund(ruling, purchasedNFT, tokenId, disputeId) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const marketContract = new ethers.Contract(disputeNFTMarket, DisputeNFTMarket.abi, signer)
    const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer)
    try{
      if(ruling == 1) {
        await escrowContract.releaseFundToBuyer(purchasedNFT, tokenId, disputeId)
      } else if (ruling ==2) {
        await escrowContract.releaseFundToSeller(purchasedNFT, tokenId, disputeId)
      }
    } catch(error) {
      console.log(error)
    }
  }

  if(loadingState === 'loaded' && !nft.length) {
    return (
    <h1 className='px-20 py-7 text-4x1'>Nothing to Claim</h1>)
  }

  return (
    <div>
    <div>
      <nav>
      <button onClick={isAuthenticated ? logout : authenticate}
        className='font-bold bg-purple-500 text-white rounded p-2 shadow-lg absolute top-4 right-2'>
        {isAuthenticated ? "Disconnect" : "Connect Wallet"}
      </button>
      </nav>
    </div>
    <div className='flex justify-center'>
       <div className='px-4' style={{maxWidth: '160px'}}>
       <div className= 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4'>
         {
           nft.map((nft,i) => (
            <div key ={i} className='border shadow rounded-x1 overflow-hidden'>
              <div className='p-4'>
                <p>
                  {"Title: "+ nft.title}
                </p>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Description: " + nft.description}</p>
                </div>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Price: " + nft.price + " MATIC"}</p>
                </div>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Token Id: " + nft.tokenId}</p>
                </div>
                <div style={{height:'72px', overflow: 'hidden'}}>
                  <p>{"Seller: " + nft.seller}</p>
                </div>
                <div style={{height:'72px', overflow: 'hidden'}}>
                  <p>{"Buyer: " + nft.buyer}</p>
                </div>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Dispute Status: " + (nft.status == 0 ? "Pending": "") }</p>
                </div>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Dispute Ruling: " + (nft.ruling == 1 ? "Buyer Wins" : "Seller Wins")}</p>
                </div>
                <div>
                    <button className='font-bold bg-purple-500 text-white rounded p-2 shadow-lg' 
                      onClick= {() => handleClaimFund(nft.ruling, nft.purchasedNFT, nft.tokenId, nft.itemId)}
                      > 
                      {nft.ruling==1? ("Claim Refund for Buyer") : ("Claim Fund for Seller")}
                    </button>
                </div>
              </div>
            </div>
           ))
          }
          </div>
       </div>
    </div>
  )
}
