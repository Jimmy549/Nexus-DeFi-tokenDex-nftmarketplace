// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  NFTCollection.sol
//  ERC-721 collection for the Nexus DeFi platform.
//  Name   : Nexus Genesis
//  Symbol : NXSG
//
//  Features:
//    • IPFS-based token URIs (per-token or base URI)
//    • Owner-controlled minting with a max supply cap
//    • ERC-721 Enumerable for on-chain listing
//    • Approved minter role so Marketplace can mint on demand
// ============================================================

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title  NFTCollection
 * @notice ERC-721 collection with IPFS metadata, per-token URIs,
 *         enumerable supply, and an approved minter role for
 *         the NFT Marketplace contract.
 */
contract NFTCollection is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    // -------------------------------------------------------
    // Constants
    // -------------------------------------------------------

    /// @notice Absolute maximum number of NFTs that can ever exist
    uint256 public constant MAX_SUPPLY = 10_000;

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @dev Auto-incrementing token ID counter (starts at 1)
    uint256 private _nextTokenId;

    /// @notice IPFS base URI — used when a token has no individual URI set
    ///         Example: "ipfs://QmYourCIDHere/"
    string public baseURI;

    /// @notice Addresses approved to call mintNFT() besides the owner
    ///         (e.g. the NFTMarketplace contract)
    mapping(address => bool) public approvedMinters;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    event MinterApproved(address indexed minter, bool approved);
    event BaseURIUpdated(string newBaseURI);

    // -------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------

    /// @dev Allows the owner OR any approved minter to call the function
    modifier onlyMinter() {
        require(
            msg.sender == owner() || approvedMinters[msg.sender],
            "NFTCollection: caller is not a minter"
        );
        _;
    }

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param initialOwner  Address that controls the contract and holds owner role
     * @param _baseURI      IPFS base URI (e.g. "ipfs://QmXXX/")
     *                      Can be empty and set later with setBaseURI()
     */
    constructor(address initialOwner, string memory _baseURI)
        ERC721("Nexus Genesis", "NXSG")
        Ownable(initialOwner)
    {
        baseURI  = _baseURI;
        _nextTokenId = 1; // start IDs at 1 (not 0)
    }

    // -------------------------------------------------------
    // Minting
    // -------------------------------------------------------

    /**
     * @notice Mint a new NFT to `recipient`.
     *         Caller must be the owner or an approved minter.
     * @param  recipient   Wallet that will receive the NFT
     * @return tokenId     ID of the newly minted token
     */
    function mintNFT(address recipient)
        external
        onlyMinter
        returns (uint256 tokenId)
    {
        require(recipient != address(0), "NFTCollection: mint to zero address");
        require(_nextTokenId <= MAX_SUPPLY, "NFTCollection: max supply reached");

        tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(recipient, tokenId);

        // Token URI = baseURI + tokenId + ".json"
        string memory uri = string(
            abi.encodePacked(baseURI, tokenId.toString(), ".json")
        );
        _setTokenURI(tokenId, uri);

        emit NFTMinted(recipient, tokenId, uri);
    }

    /**
     * @notice Mint a new NFT with a fully custom IPFS URI.
     *         Useful when each NFT has a unique pre-uploaded metadata file.
     * @param  recipient     Wallet that will receive the NFT
     * @param  customURI     Full IPFS URI for this specific token
     *                       e.g. "ipfs://QmAbcDef123.../metadata.json"
     * @return tokenId       ID of the newly minted token
     */
    function mintNFTWithURI(address recipient, string calldata customURI)
        external
        onlyMinter
        returns (uint256 tokenId)
    {
        require(recipient != address(0), "NFTCollection: mint to zero address");
        require(bytes(customURI).length > 0, "NFTCollection: empty URI");
        require(_nextTokenId <= MAX_SUPPLY, "NFTCollection: max supply reached");

        tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, customURI);

        emit NFTMinted(recipient, tokenId, customURI);
    }

    // -------------------------------------------------------
    // View functions
    // -------------------------------------------------------

    /**
     * @notice Returns the metadata URI for `tokenId`.
     *         Overrides both ERC721 and ERC721URIStorage.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Returns the total number of NFTs minted so far.
     *         Includes burned tokens if any (uses ERC721Enumerable).
     */
    function totalSupply()
        public
        view
        override(ERC721Enumerable)
        returns (uint256)
    {
        return super.totalSupply();
    }

    /**
     * @notice Returns the next token ID that will be assigned.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Returns an array of all token IDs owned by `owner`.
     * @dev    Gas-intensive for large holdings; intended for off-chain use.
     */
    function tokensOfOwner(address _owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_owner);
        uint256[] memory ids = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            ids[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return ids;
    }

    // -------------------------------------------------------
    // Owner / admin functions
    // -------------------------------------------------------

    /**
     * @notice Grant or revoke minter privileges for an address.
     *         Used to authorize the NFTMarketplace contract.
     * @param  minter   Address to update
     * @param  approved True to grant, false to revoke
     */
    function setApprovedMinter(address minter, bool approved) external onlyOwner {
        require(minter != address(0), "NFTCollection: zero address");
        approvedMinters[minter] = approved;
        emit MinterApproved(minter, approved);
    }

    /**
     * @notice Update the IPFS base URI for future mints.
     *         Existing token URIs stored individually are NOT affected.
     * @param  newBaseURI New base URI string (should end with "/")
     */
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    // -------------------------------------------------------
    // Required overrides (OpenZeppelin multi-inheritance)
    // -------------------------------------------------------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
