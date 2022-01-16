import '../styles/globals.css'
import './app.css';
import Link from 'next/link';
import { MoralisProvider } from 'react-moralis';

function DisputeNFTMarket({Component, pageProps}) {
  
   return (
    <MoralisProvider
      appId = 'v2QNNZTUsX96mL2IzvflHUF7w3ptDU6ySLI4htV8'
      serverUrl = 'https://2fh9cjsnhsiz.usemoralis.com:2053/server'
    >
    <div>
      <nav className='border-b p-6' style={{backgroundColor:'purple'}}>
        <p className='text-4x1 font-bold text-white'>JustiFi - Decentralised Dispute Resolution</p>
        <div className='flex mt-4 justify-center'>
          <Link href='/'>
            <a className='mr-4' >
              Pending Disputes
            </a>
          </Link>
          <Link href='/RaiseDisputes' >
            <a className='mr-6'>
              Raise Disputes
            </a>
          </Link>
          <Link href='/ResolvedDisputes'>
            <a className='mr-6'>
              Resolved Disputes
            </a>
          </Link>
          <Link href='/Jurors'>
            <a className='mr-6'>
              Jurors
            </a>
          </Link>
          <Link href='/ClaimFund'>
            <a className='mr-6'>
              Claim Funds
            </a>
          </Link>
          </div>
      </nav>
      <Component {...pageProps}/>
    </div>
    </MoralisProvider>
  )
}

export default DisputeNFTMarket;