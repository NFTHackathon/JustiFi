import {ethers} from 'ethers';
import {useEffect, useState} from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal'
import {disputeNFT, disputeNFTMarket} from '../config.js'
import DisputeNFT from '../artifacts/contracts/DisputeNFT.sol/DisputeNFT.json'
import DisputeNFTMarket from '../artifacts/contracts/DisputeNFTMarket.sol/DisputeNFTMarket.json'
import {useMoralis} from 'react-moralis';
import {useRouter} from 'next/router'

export default function Home(props) {
  const [nft, setNFT]= useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const { authenticate, enableWeb3, isAuthenticated, logout, user, account } = useMoralis();
  const router = useRouter();

  useEffect(() => {
    const authAndEnable = async () => {
      try {
        await enableWeb3();
      } catch (e) {
        console.log(e);
      }
    };

    if (isAuthenticated) {
      authAndEnable();
      loadNFTdata()
    }
  },[]);

  //function to display minted but unsold NFTs
  async function loadNFTdata() {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const tokenContract = new ethers.Contract(disputeNFT, DisputeNFT.abi, provider)
    const marketContract = new ethers.Contract(disputeNFTMarket, DisputeNFTMarket.abi, provider)
    const data = await marketContract.fetchPendingNFT()
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

  if(loadingState === 'loaded' && !nft.length) {
    return (
    <h1 className='px-20 py-7 text-4x1'>No NFTs in the Marketplace</h1>)
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
       <div className='px-4' style={{maxWidth: '160px'}}></div>
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
                  <p>{"Price: " + nft.price + " native token"}</p>
                </div>
                <div style={{height:'72px', overflow: 'hidden'}}>
                  <p>{"Seller: " + nft.seller}</p>
                </div>
                <div style={{height:'72px', overflow: 'hidden'}}>
                  <p>{"Buyer: " + nft.buyer}</p>
                </div>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Dispute Status: " + nft.status}</p>
                </div>
                <div style={{height:'72px', overflow: 'auto'}}>
                  <p>{"Dispute Ruling: " + nft.ruling}</p>
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
