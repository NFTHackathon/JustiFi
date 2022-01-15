import {ethers} from 'ethers';
import {useEffect, useState} from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal'
import {nftaddress, nftmarketaddress} from '../config.js'
import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import NFTMarket from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'

export default function MyNFT(props) {
  const [nft, setNFT]= useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [nftSold, setNFTSold] = useState([]);

  useEffect(async () => {
    if(typeof props.user !== 'undefined') {await loadNFTdata()}
  }, [props])

  
  // function to display minted but unsold NFTs
  async function loadNFTdata() {
    // to load provider, tokenContract, marketContract, data for marketItems
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection)
    // get Chain Id
    const chainId = await provider.getNetwork().then(network => network.chainId);
    
    if( chainId !== 4) {
      window.alert("Please connect to the Rinkeby network");
      return;
    }
    const signer = provider.getSigner()
    const tokenContract = new ethers.Contract(nftaddress, NFT.abi, signer)
    const marketContract = new ethers.Contract(nftmarketaddress, NFTMarket.abi, signer)
    const data = await marketContract.fetchListedNFT()

    // get token data of listed tokens
    const items = await Promise.all(data.map(async i => {
      // tokenUri is a json format containing metadata - image, description, characteristics
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      let item;
      try{
        const meta = await axios.get(tokenUri)
        let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
        item = {
          price, 
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
          sold: i.sold
          }
          return item;
        } catch(err) {
          item = ''
          console.log('IPFS request failed', err)
        }
      }))
    
    // filtered array of items that have been sold
    const soldItems =  items.filter(i => i.sold)
    setNFTSold(soldItems)
    setNFT(items)
    setLoadingState('loaded')
  }
  
  if(loadingState === 'loaded' && !nft.length) {
    return (
    <h1 className='px-20 py-7 text-4x1'>No NFTs Purchased</h1>)
    }

  return (
    <div className='flex justify-center'>
       <h1 style={{fontSize: '20px', color: 'purple'}}>Token Minted</h1>
       <div className='px-4' style={{maxWidth: '160px'}}></div>
       <div className= 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4'>
         {
           nft.map((nft,i) => (
            <div key ={i} className='border shadow rounded-x1 overflow-hidden'>
              <img src={nft.image}/>
              <div className='p-4'>
                <p style={{height: '64px'}} className='text-3x1 font-semibold'>
                  {nft.name}
                </p>
                <div style={{height:'72px', overflow: 'hidden'}}>
                  <p className='text-gray-400'>{nft.description}</p>
                </div>
              </div>
                <div className='p-4 bg-black'>
                  <p className='text-3x-1 mb-4 font-bold text-white'>{nft.price} ETH</p>
              </div>
              <div className='p-4 bg-black'>
                  {nft.sold ? (<h3 className='text-3x-1 mb-4 font-bold text-white'>Sold</h3>) : ""}
              </div>
            </div>
           ))
         }
       </div>
    </div>
  )
}
