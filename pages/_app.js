import '../styles/globals.css'
import './app.css';
import {useState} from 'react';
import Link from 'next/link';
import Wallet from './api/wallet'
import Web3Modal from 'web3modal'
import {ethers} from 'ethers';

function NFTMarketplace({Component, pageProps}) {
  const [user, setUser] = useState();
  const [connect, setConnect] = useState('Connect Wallet');

  const onClickButton = async () => {
    // to load provider, tokenContract, marketContract, data for marketItems
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const address = await signer.getAddress();
    setUser(address);
    // get Chain Id
    const chain = await provider.getNetwork().then(network => network.name);
    setConnect('Connected');
}

  return (
    <div>
      <nav className='border-b p-6' style={{backgroundColor:'purple'}}>
        <p className='text-4x1 font-bold text-white'>NFT Marketplace</p>
          <Wallet onClick={onClickButton} connect={connect} user={user}/>
        <div className='flex mt-4 justify-center'>
          <Link href='/'>
            <a className='mr-4' >
              Main Marketplace
            </a>
          </Link>
          <Link href='/mint-item' >
            <a className='mr-6'>
              Mint Tokens
            </a>
          </Link>
          <Link href='/mynft'>
            <a className='mr-6'>
              My NFTs
            </a>
          </Link>
          <Link href='/account-dashboard'>
            <a className='mr-6'>
              Account Dashboard
            </a>
          </Link>
          </div>
      </nav>
      <Component {...pageProps} user ={user}/>
    </div>
  )
}

export default NFTMarketplace;