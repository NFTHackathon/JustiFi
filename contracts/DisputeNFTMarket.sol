//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

/** 
 * @title Mint Dispute evidence as NFT
 */
contract DisputeNFTMarket is ReentrancyGuard {
    using Counters for Counters.Counter;
    // keep track of tokens total number - tokenId
    Counters.Counter private _tokenIds;
    // keept track of tokens that have been sold
    Counters.Counter private _tokenCancelled;
    Counters.Counter private _tokenPending;
    enum Status {Pending, Resolved, Cancelled} // Pending by default
    enum Ruling {Pending, BuyerWins, SellerWins} // Pending by default
    enum JurorVote {BuyerWins, SellerWins}
    address[] public jurors;
    address public marketPlaceOwner;
    uint256 public ARBITRATION_FEE = 0.01 ether;

    JurorVote private jurorVote;

    constructor(address _marketPlaceOwner) {
        marketPlaceOwner= _marketPlaceOwner;
    }

    modifier onlyOwner() {
        require (msg.sender == marketPlaceOwner);
        _;
    }

    modifier onlyJurors() {
        require(verifyJurors[msg.sender], "NOT_VERIFIED_JUROR");
        _;
    }

    mapping(uint256 => DisputeToken) public idToDisputeToken;
    mapping(address => bool) public verifyJurors;
    // to track the juror's vote (jurorAddress => itemId => vote outcome)
    mapping(address => mapping(uint256 => JurorVote)) public jurorDisputeVote;
    // to track the reward claimed by the juror (jurorAddress => itemId => claimed indicator)
    mapping(address => mapping(uint256 => bool)) public jurorRewardClaimed;
    //keep track of jurors vote - if voted, then true
    mapping(address => mapping(uint256 => bool)) public jurorVoted;
    //to keep track of the number of votes for a disputeID
    mapping(uint256 => uint256) public voteNumber;
    // to keep track of buyerwin for a disputeID
    mapping(uint256 => uint256) public voteBuyer;

    struct DisputeToken {
        uint256 itemId;  //item id in the marketplace
        address nftContract; //contract address
        address purchasedNFT;
        uint256 tokenId; // tokenId in an ERC721 contract
        address seller;
        address buyer;
        uint256 price;
        Status status;
        Ruling ruling;
    }

    event DisputeTokenListed(
        uint256 indexed itemId,
        address indexed nftContract,
        address indexed purchasedNFT,
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 price,
        Status status,
        Ruling ruling
    );

    event DisputeResolved(
        uint256 indexed itemId,
        address indexed nftContract,
        address indexed purchasedNFT,
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 price,
        Status status,
        Ruling ruling
    );

    event JurorAdded(
        address indexed juror,
        uint256 indexed itemId,
        address indexed purchasedNFT
    );

    function setArbitrationFee(uint256 _arbitrationFee) external onlyOwner {
        ARBITRATION_FEE= _arbitrationFee;
    }

    // function for buyer to raise a dispute and store in this contract
    // price represents the purchased price of the NFT
    // tokenId is on-chain generated
    // nftContract represents DisputeNFT contract minted NFT
    function listDispute(
        address nftContract,
        address purchasedNFT,
        uint256 tokenId,
        address seller,
        uint256 price
    )
    public payable nonReentrant {
        require(price>0, "INVALID_PRICE");
        require(msg.value == ARBITRATION_FEE, "PAYMENT_NOT_MADE");

        _tokenIds.increment();

        uint256 itemId = _tokenIds.current();

        // update details of the token Struct
        idToDisputeToken[itemId] = DisputeToken(
            itemId, 
            nftContract,
            purchasedNFT,
            tokenId,
            seller,
            msg.sender,
            price,
            Status.Pending,
            Ruling.Pending
        );

        // After buyer raised the dispute, minted NFT evidence is transferred from the tokenholder to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        emit DisputeTokenListed(
            itemId, 
            nftContract,
            purchasedNFT,
            tokenId,
            seller,
            msg.sender,
            price,
            Status.Pending,
            Ruling.Pending
        );
    }

    /**
     * @notice function for buyer to cancel the dispute
     * @param itemId uint256
     */
    function cancelDispute(
        uint256 itemId
        )
        public {
            require(idToDisputeToken[itemId].status == Status.Pending);
            idToDisputeToken[itemId].status = Status.Cancelled;
            idToDisputeToken[itemId].ruling = Ruling.SellerWins;
            _tokenCancelled.increment();
        }
   
    /** 
     * @notice function to fetch pending NFTs - identified through owner == address(0)
     * @return MarketToken - array of unsold items
     */ 
    function fetchPendingNFT() public view returns(DisputeToken[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        //a second counter for items sold
        uint256 ownedItemCount; // default 0
        uint256 currentIndex; // default 0
        // Loop through the MarketTokens and identify the number of NFTs owned by the tokenholder (ownedItemCount)
        for(uint256 i = 0; i< totalItemCount; i++) {
            if(idToDisputeToken[i+1].status == Status.Pending) {
                ownedItemCount +=1;
            }
        }
        // use ownedItemCount to initialize an array of purchased items
        DisputeToken[] memory items = new DisputeToken[](ownedItemCount);
        for (uint256 i =0; i < ownedItemCount; i++) {
            if(idToDisputeToken[i+1].status == Status.Pending) {
                uint256 currentId = idToDisputeToken[i+1].itemId;
                DisputeToken storage currentItem = idToDisputeToken[currentId];
                // store the purchased items in items array
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchCancelledNFT() public view returns(DisputeToken[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        //a second counter for items sold
        uint256 ownedItemCount; // default 0
        uint256 currentIndex; // default 0
        // Loop through the MarketTokens and identify the number of NFTs owned by the tokenholder (ownedItemCount)
        for(uint256 i = 0; i< totalItemCount; i++) {
            if(idToDisputeToken[i+1].status == Status.Cancelled) {
                ownedItemCount +=1;
            }
        }
        // use ownedItemCount to initialize an array of purchased items
        DisputeToken[] memory items = new DisputeToken[](ownedItemCount);
        for (uint256 i =0; i < ownedItemCount; i++) {
            if(idToDisputeToken[i+1].status == Status.Cancelled) {
                uint256 currentId = idToDisputeToken[i+1].itemId;
                DisputeToken storage currentItem = idToDisputeToken[currentId];
                // store the purchased items in items array
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
    
    /**
     * @notice function to fetch NFTs purchased by a tokenholder
     * @return MarketToken - array of purchased items
     */ 
    function fetchMyNFT() public view returns (DisputeToken[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        //a second counter for items sold
        uint256 ownedItemCount; // default 0
        uint256 currentIndex; // default 0
        // Loop through the MarketTokens and identify the number of NFTs owned by the tokenholder (ownedItemCount)
        for(uint256 i = 0; i< totalItemCount; i++) {
            if(idToDisputeToken[i+1].buyer == msg.sender) {
                ownedItemCount +=1;
            }
        }
        // use ownedItemCount to initialize an array of purchased items
        DisputeToken[] memory items = new DisputeToken[](ownedItemCount);
        for (uint256 i =0; i < ownedItemCount; i++) {
            if(idToDisputeToken[i+1].buyer == msg.sender) {
                uint256 currentId = idToDisputeToken[i+1].itemId;
                DisputeToken storage currentItem = idToDisputeToken[currentId];
                // store the purchased items in items array
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /**
     * @notice function to fetch all NFTs listed (both sold and unsold) by a tokenholder
     * @return MarketToken - array of listed items
     */
    function fetchResolvedNFT() public view returns(DisputeToken[] memory) {
        //similar to the previous - but would be .seller
        uint256 totalItemCount = _tokenIds.current();
        //a second counter for items listed by the seller
        uint256 listedItemCount = 0;
        uint256 currentIndex = 0;
        // Loop through the MarketTokens and identify the number of NFTs listed/minted by the user (listedItemCount)
        for(uint256 i = 0; i< totalItemCount; i++) {
            if(idToDisputeToken[i+1].status == Status.Resolved) {
                listedItemCount +=1;
            }
        }
        // use the listedItemCount to initialize an array of minted/listed tokens
        DisputeToken[] memory items = new DisputeToken[](listedItemCount);
        for (uint256 i =0; i < listedItemCount; i++) {
            if(idToDisputeToken[i+1].status == Status.Resolved) {
                uint256 currentId = idToDisputeToken[i+1].itemId;
                DisputeToken storage currentItem = idToDisputeToken[currentId];
                // store the listed items in an array
                items[currentIndex] = currentItem;
                currentIndex += 1;
            } 
        }
        return items;
    }

    function fetchDisputeStatus(uint256 itemId) external view returns(uint8) {
        if(idToDisputeToken[itemId].status == Status.Pending) {
            return 0;
        } else if(idToDisputeToken[itemId].status == Status.Resolved) {
            return 1;
        } else if(idToDisputeToken[itemId].status == Status.Cancelled) {
            return 2;
        }
    }

    function fetchRuling(uint256 itemId) external view returns(uint8) {
        if(idToDisputeToken[itemId].ruling == Ruling.Pending) {
            return 0;
        } else if (idToDisputeToken[itemId].ruling == Ruling.BuyerWins) {
            return 1;
        } else if (idToDisputeToken[itemId].ruling == Ruling.SellerWins) {
            return 2;
        }
    } 
    
    // only Owner can add juror
    function addJurors(address _juror) external onlyOwner {
        require(jurors.length <= 3, "JUROR_NUMBER_EXCEEDED");
        verifyJurors[_juror] = true;
        jurors.push(_juror);
    }

    // only jurors can vote 
    // once vote reaches 
    function vote(uint256 itemId, JurorVote _jurorVote) external onlyJurors returns (DisputeToken memory){
        require(idToDisputeToken[itemId].status == Status.Pending, "NOT_ELIGIBLE_FOR_VOTING");
        require(!jurorVoted[msg.sender][itemId],"JUROR_ALREADY_VOTED");
        require(_jurorVote == JurorVote.BuyerWins || _jurorVote == JurorVote.SellerWins, "NOT_VALID_VOTE");
        require(voteNumber[itemId]<3,"DISPUTE_ALREADY_VOTED");
        
        jurorDisputeVote[msg.sender][itemId]= _jurorVote;
        jurorVoted[msg.sender][itemId] = true;
        voteNumber[itemId]++;
        if(_jurorVote == JurorVote.BuyerWins) {
            voteBuyer[itemId]++;
        }
        if(voteNumber[itemId]==3) {
            if(voteBuyer[itemId]>=2) {
                idToDisputeToken[itemId].ruling = Ruling.BuyerWins;
            } else {
                idToDisputeToken[itemId].ruling = Ruling.SellerWins;
            }
            idToDisputeToken[itemId].status = Status.Resolved;
            

        }

         emit DisputeResolved(
            itemId,
            idToDisputeToken[itemId].nftContract,
            idToDisputeToken[itemId].purchasedNFT,
            idToDisputeToken[itemId].tokenId,
            idToDisputeToken[itemId].seller,
            idToDisputeToken[itemId].buyer,
            idToDisputeToken[itemId].price,
            idToDisputeToken[itemId].status,
            idToDisputeToken[itemId].ruling
        );

        return idToDisputeToken[itemId];
    }

    function jurorClaimReward(uint256 itemId) external {
        require(idToDisputeToken[itemId].status == Status.Resolved, "CASE_NOT_RESOLVED");
        require(jurorVoted[msg.sender][itemId],"JUROR_NOT_VOTED_YET");
        require(!jurorRewardClaimed[msg.sender][itemId],"ALREADY_CLAIMED");
        if(idToDisputeToken[itemId].ruling == Ruling.BuyerWins) {
            if(jurorDisputeVote[msg.sender][itemId]== JurorVote.BuyerWins) {
                jurorRewardClaimed[msg.sender][itemId] = true;
                (bool success,) = payable(msg.sender).call{value: ARBITRATION_FEE/3}("");
                require(success,"TRANSFER_FAILED");
            }
        } else if (idToDisputeToken[itemId].ruling == Ruling.SellerWins) {
            if(jurorDisputeVote[msg.sender][itemId]== JurorVote.SellerWins) {
                jurorRewardClaimed[msg.sender][itemId] = true;
                (bool success,) = payable(msg.sender).call{value: ARBITRATION_FEE/3}("");
                require(success,"TRANSFER_FAILED");
            }
        }

    }
    
}
