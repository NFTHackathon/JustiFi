//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "./DisputeNFTMarket.sol";
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract Escrow {
    
    address payable buyer;
    address payable seller;
    uint256 DELAY = 5 days;
    DisputeNFTMarket immutable disputeNFTMarket;
    address private marketplaceOwner;

    constructor(address _disputeNFTMarketAddr, address _marketplaceOwner) {
        disputeNFTMarket = DisputeNFTMarket(_disputeNFTMarketAddr);
        marketplaceOwner = _marketplaceOwner;
    }

    modifier onlyOwner() {
        require (msg.sender == marketplaceOwner);
        _;
    }

    event BuyWithSafeArb(
        address buyer, 
        address seller, 
        address purchasedNFT, 
        uint256 tokenId, 
        uint256 nftPrice,
        uint256 timeOfPurchase
    );

    struct Purchase {
        address buyer;
        address seller;
        address purchasedNFT;
        uint256 tokenId;
        uint256 nftPrice;
        uint256 timeOfPurchase;
    }
    
    mapping(address => mapping(uint256 => Purchase)) nftToPurchase;
    // nftAddress => tokenId => seller => boolean
    mapping(address => mapping(uint256 => mapping(address => bool))) fundClaimed;
    // to track the return of NFT by the buyer (nftAddress => tokenId => buyer => return indicator)
    mapping(address => mapping(uint256 => mapping(address=>bool))) nftReturned;
    // buyer can choose to buyWithSafeArb
    // money will go into Escrow
    // seller, tokenId, purchased nftAddress and nftPrice will get from marketplace
    function buyWithJustiFi (address _seller, address _purchasedNFT, uint256 _tokenId, uint256 _nftPrice) payable public {
        require(msg.value >= _nftPrice, "INSUFFICIENT_BALANCE");
        nftToPurchase[_purchasedNFT][_tokenId] = Purchase(
            msg.sender,
            _seller,
            _purchasedNFT,
            _tokenId,
            _nftPrice,
            block.timestamp
        );
       
       (bool success,) = address(this).call{value: _nftPrice}("");
        require(success, "transfer failed");
        emit BuyWithSafeArb(msg.sender, _seller, _purchasedNFT, _tokenId, _nftPrice, block.timestamp);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // function to set delay to refund to seller;
    function setDelay(uint256 _delayInSeconds) onlyOwner external {
        DELAY = _delayInSeconds;
    }

    // release fund to seller if seller wins
    function releaseFundToSeller(address _purchasedNFT, uint256 _tokenId, uint256 disputeId) external {
        require(msg.sender == nftToPurchase[_purchasedNFT][_tokenId].seller, "NOT_SELLER");
        require(disputeNFTMarket.fetchRuling(disputeId) == 2, "NOT_ELIGIBLE_FOR_FUND");
        require(!fundClaimed[_purchasedNFT][_tokenId][msg.sender], "CLAIMED_ALREADY");
        uint256 nftPrice= nftToPurchase[_purchasedNFT][_tokenId].nftPrice;
        fundClaimed[_purchasedNFT][_tokenId][msg.sender] = true;
        (bool success,) = payable(msg.sender).call{value: nftPrice}("");
        require(success, "TRANSFER_TO_SELLER_FAILED");
    }

    // nft token Id and NFT contract address to get from exchange
    // refund to seller after 5 days if no dispute
    function releaseFundToSellerNoDispute(uint256 _tokenId, address _purchasedNFT) external {
        require(block.timestamp> nftToPurchase[_purchasedNFT][_tokenId].timeOfPurchase + DELAY, "TIME");
        require(nftToPurchase[_purchasedNFT][_tokenId].seller == msg.sender,"NOT_SELLER");
        require(!fundClaimed[_purchasedNFT][_tokenId][msg.sender], "CLAIMED_ALREADY");

        uint256 nftPrice= nftToPurchase[_purchasedNFT][_tokenId].nftPrice;
        fundClaimed[_purchasedNFT][_tokenId][msg.sender] = true;
        (bool success,) = payable(msg.sender).call{value: nftPrice}("");
        require(success, "TRANSFER_TO_SELLER_FAILED");
    }

    //buyer to return NFT first before claiming for refund
    // buyer has to approve the transfer first
    function approveNFTReturn (address _purchasedNFT, uint256 _tokenId) external {
        ERC721(_purchasedNFT).approve(address(this), _tokenId);
    }
    
    //buyer to return NFT first before claiming for refund
    function returnNFT(address _purchasedNFT, uint256 _tokenId) external {
        nftReturned[_purchasedNFT][_tokenId][msg.sender]==true;
        ERC721(_purchasedNFT).safeTransferFrom(msg.sender, address(this), _tokenId);

    }

    // buyer claims refund if the buyer wins
    function releaseFundToBuyer(address _purchasedNFT, uint256 _tokenId, uint256 disputeId) external {
        require(msg.sender == nftToPurchase[_purchasedNFT][_tokenId].buyer, "NOT_BUYER");
        require(disputeNFTMarket.fetchRuling(disputeId) == 1, "NOT_ELIGIBLE_FOR_FUND");
        require(!fundClaimed[_purchasedNFT][_tokenId][msg.sender], "CLAIMED_ALREADY");
        require(nftReturned[_purchasedNFT][_tokenId][msg.sender], "RETURN_NFT_FIRST");
        uint256 nftPrice= nftToPurchase[_purchasedNFT][_tokenId].nftPrice;
        fundClaimed[_purchasedNFT][_tokenId][msg.sender] = true;
        (bool success,) = payable(msg.sender).call{value: nftPrice}("");
        require(success, "TRANSFER_TO_SELLER_FAILED");
    }

    receive() external payable {}

    fallback() external payable {}
}