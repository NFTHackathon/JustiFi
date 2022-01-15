//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

/** 
 * @title ERC721 NFT contract with URI extension
 */

contract DisputeNFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    //address of marketplace for NFTs to interface
    address immutable private contractAddress;

    constructor(address marketplaceAddress) ERC721('Marvel', 'MARVEL') {
        contractAddress = marketplaceAddress;
    }

    /** 
     * @notice function to mint and store token URI
     * @param _tokenURI string - where JSON metadata is stored
     * @dev tokenURI is declared in ERC721 contract, and will be initialized by _tokenURI
     */
    function mintToken (string memory _tokenURI) public returns(uint) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        // mint takes 2 argument - recipient and tokenId
        _mint(msg.sender, newItemId);
        // takes tokenId and URI 
        _setTokenURI(newItemId, _tokenURI);
        // give the marketplace the approval to transact between users for all listed NFTs
        setApprovalForAll(contractAddress, true);
        // mint the token and set it for sale- return the id to do so
        return newItemId;
    }
}
