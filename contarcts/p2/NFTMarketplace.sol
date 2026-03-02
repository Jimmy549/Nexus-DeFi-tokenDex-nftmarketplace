// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  NFTMarketplace.sol
//  Secondary-market & primary-mint marketplace for Nexus Genesis NFTs.
//
//  Payment modes:
//    1. Direct — buyer pays in Platform Token (NXS)
//    2. Multi-token — buyer pays in ANY token that has a DEX pool
//                     with NXS.  The Marketplace:
//                       a) fetches the pool from DEXFactory
//                       b) calculates the NXS-equivalent price
//                       c) pulls the payment token from the buyer
//                       d) swaps it → NXS via LiquidityPool
//                       e) mints / transfers the NFT to the buyer
//
//  Listing types:
//    • MINT  — Marketplace calls NFTCollection.mintNFT() on purchase
//              (requires Marketplace to be an approved minter)
//    • RESALE — Seller has listed an existing NFT at a price
//
//  Fee:
//    • Platform takes a configurable fee (default 2.5 %) on every sale
//    • Accumulated fees are withdrawable by the owner
// ============================================================

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// -------------------------------------------------------
// Interfaces (lean — only the functions we call)
// -------------------------------------------------------

interface INFTCollection {
    function mintNFT(address recipient) external returns (uint256 tokenId);
    function totalSupply() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IDEXFactory {
    function getPool(address tokenA, address tokenB) external view returns (address);
}

interface ILiquidityPool {
    function swapBforA(uint256 amountBIn) external returns (uint256 amountAOut);
    function getReserves() external view returns (uint256 reserveA, uint256 reserveB);
    function previewSwap(uint256 amountAIn) external view returns (uint256 amountBOut);
    function previewSwapReverse(uint256 amountBIn) external view returns (uint256 amountAOut);
    function tokenA() external view returns (address);
    function tokenB() external view returns (address);
}

/**
 * @title  NFTMarketplace
 * @notice Buy Nexus Genesis NFTs with NXS or any DEX-supported token.
 *         Sellers can list existing NFTs; the contract also mints new ones.
 */
contract NFTMarketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------
    // Types
    // -------------------------------------------------------

    enum ListingType { MINT, RESALE }

    struct Listing {
        uint256  tokenId;          // 0 for MINT listings (assigned at purchase)
        address  seller;           // address(0) for MINT listings
        uint256  priceInNXS;       // price in NXS (18-decimal wei)
        bool     active;
        ListingType listingType;
    }

    // -------------------------------------------------------
    // Constants
    // -------------------------------------------------------

    /// @notice Maximum platform fee in basis points (10 % hard cap)
    uint256 public constant MAX_FEE_BPS = 1_000;
    uint256 private constant BPS        = 10_000;

    // -------------------------------------------------------
    // Immutables
    // -------------------------------------------------------

    /// @notice NXS platform token
    IERC20 public immutable platformToken;

    /// @notice NFT collection contract
    INFTCollection public immutable nftCollection;

    /// @notice DEX factory for pool look-ups
    IDEXFactory public immutable dexFactory;

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @notice Platform fee in basis points (default 250 = 2.5 %)
    uint256 public feeBps;

    /// @notice Accumulated platform fees (in NXS) available for withdrawal
    uint256 public accumulatedFees;

    /// @dev listingId → Listing
    mapping(uint256 => Listing) public listings;

    /// @dev Total listings ever created (used as listing ID counter)
    uint256 public listingCount;

    /// @dev tokenId → active resale listingId (0 = not listed)
    mapping(uint256 => uint256) public activeResaleListing;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event MintListingCreated(uint256 indexed listingId, uint256 priceInNXS);
    event ResaleListingCreated(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 priceInNXS
    );
    event ListingCancelled(uint256 indexed listingId);
    event NFTPurchasedWithNXS(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 pricePaid
    );
    event NFTPurchasedWithToken(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed buyer,
        address paymentToken,
        uint256 tokenAmountPaid,
        uint256 nxsSwapped
    );
    event PriceUpdated(uint256 indexed listingId, uint256 newPriceInNXS);
    event FeeUpdated(uint256 newFeeBps);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param _platformToken  Address of NXS ERC-20 token
     * @param _nftCollection  Address of NFTCollection contract
     * @param _dexFactory     Address of DEXFactory contract
     * @param _feeBps         Initial platform fee in basis points (e.g. 250 = 2.5 %)
     * @param initialOwner    Owner/admin of this marketplace
     */
    constructor(
        address _platformToken,
        address _nftCollection,
        address _dexFactory,
        uint256 _feeBps,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_platformToken != address(0), "Marketplace: invalid token");
        require(_nftCollection != address(0), "Marketplace: invalid collection");
        require(_dexFactory    != address(0), "Marketplace: invalid factory");
        require(_feeBps <= MAX_FEE_BPS,       "Marketplace: fee exceeds cap");

        platformToken = IERC20(_platformToken);
        nftCollection = INFTCollection(_nftCollection);
        dexFactory    = IDEXFactory(_dexFactory);
        feeBps        = _feeBps;
    }

    // -------------------------------------------------------
    // Listing management
    // -------------------------------------------------------

    /**
     * @notice Create a "mint" listing — any buyer triggers a new NFT mint.
     *         Only the owner can create mint listings (controls supply).
     * @param  priceInNXS  Sale price in NXS (wei)
     * @return listingId
     */
    function createMintListing(uint256 priceInNXS)
        external
        onlyOwner
        returns (uint256 listingId)
    {
        require(priceInNXS > 0, "Marketplace: price must be > 0");

        listingId = ++listingCount;
        listings[listingId] = Listing({
            tokenId     : 0,
            seller      : address(0),
            priceInNXS  : priceInNXS,
            active      : true,
            listingType : ListingType.MINT
        });

        emit MintListingCreated(listingId, priceInNXS);
    }

    /**
     * @notice List an existing NFT for resale.
     *         Caller must own the NFT and have approved this contract.
     * @param  tokenId     NFT token ID to list
     * @param  priceInNXS  Desired sale price in NXS (wei)
     * @return listingId
     */
    function createResaleListing(uint256 tokenId, uint256 priceInNXS)
        external
        returns (uint256 listingId)
    {
        require(priceInNXS > 0, "Marketplace: price must be > 0");
        require(
            nftCollection.ownerOf(tokenId) == msg.sender,
            "Marketplace: not token owner"
        );
        require(
            nftCollection.isApprovedForAll(msg.sender, address(this)) ||
            nftCollection.getApproved(tokenId) == address(this),
            "Marketplace: not approved to transfer NFT"
        );
        require(activeResaleListing[tokenId] == 0, "Marketplace: already listed");

        listingId = ++listingCount;
        listings[listingId] = Listing({
            tokenId     : tokenId,
            seller      : msg.sender,
            priceInNXS  : priceInNXS,
            active      : true,
            listingType : ListingType.RESALE
        });
        activeResaleListing[tokenId] = listingId;

        emit ResaleListingCreated(listingId, tokenId, msg.sender, priceInNXS);
    }

    /**
     * @notice Cancel an active listing.
     *         Owner can cancel mint listings; seller can cancel their resale listings.
     * @param  listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: listing not active");

        if (listing.listingType == ListingType.MINT) {
            require(msg.sender == owner(), "Marketplace: only owner can cancel mint listing");
        } else {
            require(
                msg.sender == listing.seller || msg.sender == owner(),
                "Marketplace: not authorized"
            );
            activeResaleListing[listing.tokenId] = 0;
        }

        listing.active = false;
        emit ListingCancelled(listingId);
    }

    /**
     * @notice Update the NXS price of an active listing.
     */
    function setNFTPrice(uint256 listingId, uint256 newPrice) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: listing not active");
        require(newPrice > 0,   "Marketplace: price must be > 0");

        if (listing.listingType == ListingType.MINT) {
            require(msg.sender == owner(), "Marketplace: only owner");
        } else {
            require(msg.sender == listing.seller, "Marketplace: not seller");
        }

        listing.priceInNXS = newPrice;
        emit PriceUpdated(listingId, newPrice);
    }

    // -------------------------------------------------------
    // Purchase — Platform Token (NXS)
    // -------------------------------------------------------

    /**
     * @notice Buy an NFT by paying in NXS directly.
     * @param  listingId  The listing to purchase
     */
    function buyNFTWithPlatformToken(uint256 listingId)
        external
        nonReentrant
    {
        Listing storage listing = _getActiveListing(listingId);
        uint256 price = listing.priceInNXS;

        // Pull NXS from buyer
        platformToken.safeTransferFrom(msg.sender, address(this), price);

        // Distribute: fee to contract, remainder to seller (or kept for mint listings)
        uint256 fee = _calcFee(price);
        uint256 sellerProceeds = price - fee;
        accumulatedFees += fee;

        if (listing.listingType == ListingType.RESALE) {
            platformToken.safeTransfer(listing.seller, sellerProceeds);
        }
        // For MINT listings, sellerProceeds stay in the contract (platform revenue)
        // or can be forwarded to the owner — here we forward to owner
        else {
            platformToken.safeTransfer(owner(), sellerProceeds);
        }

        uint256 tokenId = _fulfillPurchase(listing, msg.sender);
        listing.active  = false;
        if (listing.listingType == ListingType.RESALE) {
            activeResaleListing[tokenId] = 0;
        }

        emit NFTPurchasedWithNXS(listingId, tokenId, msg.sender, price);
    }

    // -------------------------------------------------------
    // Purchase — Any DEX-supported token
    // -------------------------------------------------------

    /**
     * @notice Buy an NFT paying with any token that has a DEX pool with NXS.
     * @dev    Flow:
     *           1. Calculate how much `paymentToken` equals the NXS price
     *           2. Pull `paymentToken` from buyer
     *           3. Approve LiquidityPool to spend `paymentToken`
     *           4. Swap paymentToken → NXS via the pool
     *           5. Verify received NXS >= listing price (slippage guard)
     *           6. Distribute NXS proceeds to seller / owner
     *           7. Transfer / mint NFT to buyer
     * @param  listingId     Listing to purchase
     * @param  paymentToken  ERC-20 token address the buyer wants to pay with
     */
    function buyNFTWithToken(uint256 listingId, address paymentToken)
        external
        nonReentrant
    {
        require(paymentToken != address(platformToken), "Marketplace: use buyNFTWithPlatformToken");
        require(paymentToken != address(0),             "Marketplace: zero address");

        Listing storage listing = _getActiveListing(listingId);
        uint256 nxsRequired = listing.priceInNXS;

        // ---- Step 1: Find the pool ----
        address poolAddr = dexFactory.getPool(address(platformToken), paymentToken);
        require(poolAddr != address(0), "Marketplace: no DEX pool for this token");

        ILiquidityPool pool = ILiquidityPool(poolAddr);

        // ---- Step 2: Calculate how many paymentTokens buyer needs ----
        uint256 tokenAmountIn = _calcPaymentTokenAmount(pool, paymentToken, nxsRequired);
        require(tokenAmountIn > 0, "Marketplace: pool has insufficient liquidity");

        // Add 1% slippage buffer so small price movements don't revert
        uint256 tokenAmountInWithBuffer = tokenAmountIn + (tokenAmountIn / 100);

        // ---- Step 3: Pull payment tokens from buyer ----
        IERC20(paymentToken).safeTransferFrom(msg.sender, address(this), tokenAmountInWithBuffer);

        // ---- Step 4: Approve pool and swap ----
        IERC20(paymentToken).forceApprove(poolAddr, tokenAmountInWithBuffer);

        // Determine direction: pool.tokenA == paymentToken → swapAforB, else swapBforA
        uint256 nxsReceived;
        if (pool.tokenA() == paymentToken) {
            // paymentToken is tokenA in the pool → swapping A for B
            // But B may or may not be NXS. We need NXS out.
            // The factory sorts by address, so we need to check which side is NXS.
            nxsReceived = pool.swapAforB(tokenAmountInWithBuffer);
        } else {
            nxsReceived = pool.swapBforA(tokenAmountInWithBuffer);
        }

        require(nxsReceived >= nxsRequired, "Marketplace: insufficient NXS from swap");

        // ---- Step 5: Refund unused NXS (from buffer) if any ----
        uint256 nxsSurplus = nxsReceived - nxsRequired;
        if (nxsSurplus > 0) {
            platformToken.safeTransfer(msg.sender, nxsSurplus);
        }

        // Also refund any unused paymentTokens from the buffer
        uint256 tokenSurplus = IERC20(paymentToken).balanceOf(address(this));
        if (tokenSurplus > 0) {
            IERC20(paymentToken).safeTransfer(msg.sender, tokenSurplus);
        }

        // ---- Step 6: Distribute NXS proceeds ----
        uint256 fee = _calcFee(nxsRequired);
        uint256 sellerProceeds = nxsRequired - fee;
        accumulatedFees += fee;

        if (listing.listingType == ListingType.RESALE) {
            platformToken.safeTransfer(listing.seller, sellerProceeds);
        } else {
            platformToken.safeTransfer(owner(), sellerProceeds);
        }

        // ---- Step 7: Transfer / mint NFT ----
        uint256 tokenId = _fulfillPurchase(listing, msg.sender);
        listing.active  = false;
        if (listing.listingType == ListingType.RESALE) {
            activeResaleListing[tokenId] = 0;
        }

        emit NFTPurchasedWithToken(
            listingId, tokenId, msg.sender, paymentToken, tokenAmountInWithBuffer, nxsReceived
        );
    }

    // -------------------------------------------------------
    // Price calculation views
    // -------------------------------------------------------

    /**
     * @notice Returns the NXS price for listing `listingId`.
     * @param  listingId Listing ID to query
     * @return price     NXS price in wei
     */
    function getNFTPriceInNXS(uint256 listingId) external view returns (uint256 price) {
        price = listings[listingId].priceInNXS;
    }

    /**
     * @notice Calculates how many units of `paymentToken` a buyer must provide
     *         to purchase listing `listingId`.
     * @param  listingId    Listing to price
     * @param  paymentToken Token the buyer will pay with
     * @return tokenAmount  Required amount (in paymentToken wei) including 1 % buffer
     */
    function calculatePriceInToken(uint256 listingId, address paymentToken)
        external
        view
        returns (uint256 tokenAmount)
    {
        require(listings[listingId].active, "Marketplace: listing not active");
        uint256 nxsRequired = listings[listingId].priceInNXS;

        address poolAddr = dexFactory.getPool(address(platformToken), paymentToken);
        require(poolAddr != address(0), "Marketplace: no DEX pool for this token");

        ILiquidityPool pool = ILiquidityPool(poolAddr);
        uint256 raw = _calcPaymentTokenAmount(pool, paymentToken, nxsRequired);
        // Add 1 % buffer to match what buyNFTWithToken will pull
        tokenAmount = raw + (raw / 100);
    }

    /**
     * @notice Returns all active listings as parallel arrays for easy frontend parsing.
     * @return listingIds   Array of listing IDs
     * @return tokenIds     Array of token IDs (0 = mint listing)
     * @return sellers      Array of seller addresses (address(0) = mint listing)
     * @return prices       Array of NXS prices
     * @return types        Array of listing types (0 = MINT, 1 = RESALE)
     */
    function listAllNFTs()
        external
        view
        returns (
            uint256[] memory listingIds,
            uint256[] memory tokenIds,
            address[] memory sellers,
            uint256[] memory prices,
            uint8[]   memory types
        )
    {
        // First pass: count active listings
        uint256 active = 0;
        for (uint256 i = 1; i <= listingCount; i++) {
            if (listings[i].active) active++;
        }

        listingIds = new uint256[](active);
        tokenIds   = new uint256[](active);
        sellers    = new address[](active);
        prices     = new uint256[](active);
        types      = new uint8[](active);

        uint256 idx = 0;
        for (uint256 i = 1; i <= listingCount; i++) {
            Listing storage l = listings[i];
            if (l.active) {
                listingIds[idx] = i;
                tokenIds[idx]   = l.tokenId;
                sellers[idx]    = l.seller;
                prices[idx]     = l.priceInNXS;
                types[idx]      = uint8(l.listingType);
                idx++;
            }
        }
    }

    // -------------------------------------------------------
    // Owner admin
    // -------------------------------------------------------

    /**
     * @notice Update the platform fee.
     * @param  newFeeBps New fee in basis points (max 1000 = 10 %)
     */
    function setFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Marketplace: exceeds cap");
        feeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    /**
     * @notice Withdraw accumulated platform fees to `to`.
     * @param  to  Recipient address
     */
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Marketplace: zero address");
        uint256 amount = accumulatedFees;
        require(amount > 0, "Marketplace: no fees to withdraw");
        accumulatedFees = 0;
        platformToken.safeTransfer(to, amount);
        emit FeesWithdrawn(to, amount);
    }

    // -------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------

    /**
     * @dev Validates and returns an active listing; reverts otherwise.
     */
    function _getActiveListing(uint256 listingId)
        internal
        view
        returns (Listing storage listing)
    {
        listing = listings[listingId];
        require(listing.active,         "Marketplace: listing not active");
        require(listing.priceInNXS > 0, "Marketplace: invalid price");
    }

    /**
     * @dev Mints (MINT listing) or transfers (RESALE listing) the NFT to `buyer`.
     *      Returns the tokenId that was transferred.
     */
    function _fulfillPurchase(Listing storage listing, address buyer)
        internal
        returns (uint256 tokenId)
    {
        if (listing.listingType == ListingType.MINT) {
            tokenId = nftCollection.mintNFT(buyer);
        } else {
            tokenId = listing.tokenId;
            nftCollection.safeTransferFrom(listing.seller, buyer, tokenId);
        }
    }

    /**
     * @dev Calculates how many units of `paymentToken` are needed to obtain
     *      `nxsRequired` from a LiquidityPool swap.
     *
     *      Because the pool uses x*y=k and we know the desired output (NXS),
     *      we derive the required input using the inverse formula:
     *
     *        amountIn = (reserveIn * amountOut * BPS)
     *                   / ((reserveOut - amountOut) * (BPS - FEE_BPS))  + 1
     *
     *      This is the standard "getAmountIn" formula used by Uniswap V2.
     */
    function _calcPaymentTokenAmount(
        ILiquidityPool pool,
        address paymentToken,
        uint256 nxsRequired
    ) internal view returns (uint256 tokenAmountIn) {
        (uint256 reserveA, uint256 reserveB) = pool.getReserves();

        // Determine which reserve is NXS (output) and which is paymentToken (input)
        uint256 reserveIn;
        uint256 reserveOut;

        if (pool.tokenA() == paymentToken) {
            // tokenA = paymentToken (input), tokenB = NXS (output)
            reserveIn  = reserveA;
            reserveOut = reserveB;
        } else {
            // tokenA = NXS (output), tokenB = paymentToken (input)
            reserveIn  = reserveB;
            reserveOut = reserveA;
        }

        require(reserveOut > nxsRequired, "Marketplace: pool has insufficient NXS liquidity");

        // getAmountIn formula (Uniswap V2 standard, 0.3 % fee → BPS - 30 = 9970)
        uint256 numerator   = reserveIn * nxsRequired * BPS;
        uint256 denominator = (reserveOut - nxsRequired) * (BPS - 30); // 30 bps fee
        tokenAmountIn       = (numerator / denominator) + 1;            // round up
    }

    /**
     * @dev Computes the platform fee for a given amount.
     */
    function _calcFee(uint256 amount) internal view returns (uint256) {
        return (amount * feeBps) / BPS;
    }
}
