import {ethers} from 'ethers';
import {useState} from 'react';
import {create as ipfsHttpClient} from 'ipfs-http-client'
import Web3Modal from 'web3modal'
import {disputeNFT, disputeNFTMarket} from '../config.js'
import DisputeNFT from '../artifacts/contracts/DisputeNFT.sol/DisputeNFT.json'
import DisputeNFTMarket from '../artifacts/contracts/DisputeNFTMarket.sol/DisputeNFTMarket.json'
import IERC721 from '@openzeppelin/contracts/build/contracts/IERC20.json';
// useRouter to push to another webpage
import {useRouter} from 'next/router'

// get this from infura IPFS site
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

export default function MintItem() {
    const [fileUrl, setFileUrl] = useState(null)
    const [formInput, updateFormInput] = useState({price:'',title:'', description:'', address:'', tokenId:'', seller:''})
    const router = useRouter()

    // grab image data from ipfs 
    async function onChange(e) {
        const file= e.target.files[0]
        try {
        // upload metadata to infura-ipfs
        const added = await client.add(
            file, {
                progress: (prog) => console.log(`received: ${prog}`)
            }
        )
        // get metadata file path
        const url = `https://ipfs.infura.io/ipfs/${added.path}`
        setFileUrl(url)
        } catch (err) {
            console.log('Error uploading file', err)
        }
    }   
    
    // function to list an item that has been minted
    async function createMarket() {
        const {title, description, price, address, tokenId, seller} = formInput
        if(!title || !description || !price || !address || !tokenId || !seller) return
        
        const data = JSON.stringify({
            title, description, price, address, tokenId, seller
        })
        
        try {
            // upload metadata to infura-ipfs
            const added = await client.add(data)
            const url = `https://ipfs.infura.io/ipfs/${added.path}`
            createDisputes(url, formInput.address, formInput.price, formInput.seller)
        } catch (err) {
                console.log('Error uploading file', err)
        }
    }

    //create the item through the form, mint token and list it on the marketplace
    async function createDisputes(url, NFTaddress, price, seller) {
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection)

        const signer = provider.getSigner()
        
        // create a contract instance and call methods
        let NFTcontract = new ethers.Contract(disputeNFT, DisputeNFT.abi, signer)
        // call mintToken function
        let transaction = await NFTcontract.mintToken(url)
        // resolves to transactionReceipt
        let tx = await transaction.wait()
        console.log(tx)
        // based on transactionReceipt, extract tokenId
        let tokenId = tx.events[0].args[2].toNumber()
        console.log(tokenId)
        const NFTprice = ethers.utils.parseUnits(price, 'ether')

        //list the item for sale on the marketplace
        let contract = new ethers.Contract(disputeNFTMarket, DisputeNFTMarket.abi, signer);
        let arbFee = await contract.ARBITRATION_FEE();
        console.log(arbFee);
        arbFee = arbFee.toString();
        transaction = await contract.listDispute(disputeNFT, NFTaddress, tokenId, seller, NFTprice, {value: arbFee})
        await transaction.wait()
        router.push('./')
    }

    return (
        <div className='flex justify-center'>
            <div className='w-1/2 flex flex-col pb-12'>
                <br />
                <div>
                    <p>Please be aware that each dispute raised will cost 0.01 native token of the blockchain</p>
                </div>
                <input
                placeholder = 'Subject Title'
                className='mt-8 border rounded p-4'
                onChange={e => updateFormInput({...formInput, title: e.target.value})}
                />
                <textarea
                placeholder = 'Description of dispute'
                className='mt-2 border rounded p-4'
                onChange={e => updateFormInput({...formInput, description: e.target.value})}
                />
                <input
                placeholder = 'Purchased NFT Address'
                className='mt-2 border rounded p-4'
                onChange={e => updateFormInput({...formInput, address: e.target.value})}
                />
                <input
                placeholder = 'NFT TokenId'
                className='mt-2 border rounded p-4'
                onChange={e => updateFormInput({...formInput, tokenId: e.target.value})}
                />
                <input
                placeholder = 'NFT Seller'
                className='mt-2 border rounded p-4'
                onChange={e => updateFormInput({...formInput, seller: e.target.value})}
                />
                <input
                placeholder = 'Purchased NFT Price (in native token)'
                className='mt-2 border rounded p-4'
                onChange={e => updateFormInput({...formInput, price: e.target.value})}
                />
                <button onClick={() => createMarket()}
                className='font-bold mt-4 bg-purple-500 text-white rounded p-4 shadow-lg'>
                    Raise Dispute
                </button>
            </div>

        </div>
    )

}