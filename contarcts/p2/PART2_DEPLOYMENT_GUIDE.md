# 🚀 Part 2 — Deployment, Testing & Usage Guide
## NFT Collection + Marketplace + DEX Integration

> **Prerequisite:** All Part 1 contracts must be deployed and their addresses noted.
> You need: `NXS_ADDRESS`, `TOKEN_A_ADDRESS`, `TOKEN_B_ADDRESS`, `FACTORY_ADDRESS`, `POOL_NXS_ALPH`, `POOL_NXS_BETA`

---

## 📁 New Contracts in Part 2

| File | Contract | Purpose |
|---|---|---|
| `NFTCollection.sol` | `NFTCollection` (NXSG) | ERC-721 with IPFS metadata, enumerable, minter roles |
| `NFTMarketplace.sol` | `NFTMarketplace` | Buy NFTs with NXS or any DEX token; mint + resale listings |

---

## 1️⃣ Compiler Setup (same as Part 1)

In Remix:
```
Compiler : 0.8.20+
EVM      : paris
Optimize : ✅ 200 runs
```

Add both new files to your `nexus/` folder in Remix.  
Both files import from OpenZeppelin — same setup as Part 1.

---

## 2️⃣ IPFS Metadata Setup (Before Deploying NFTCollection)

Each NFT needs a JSON metadata file on IPFS. Here's the recommended workflow:

### A — Prepare metadata files

Create JSON files for each NFT numbered `1.json`, `2.json`, etc.:

```json
{
  "name": "Nexus Genesis #1",
  "description": "A founding NFT of the Nexus DeFi ecosystem.",
  "image": "ipfs://QmYourImageCID/1.png",
  "attributes": [
    { "trait_type": "Tier",   "value": "Genesis" },
    { "trait_type": "Rarity", "value": "Rare" },
    { "trait_type": "Power",  "value": 42 }
  ]
}
```

### B — Upload to IPFS

Option 1 — **Pinata** (recommended for beginners):
1. Sign up at https://pinata.cloud
2. Upload your images folder → copy CID → note as `IMAGE_CID`
3. Update all JSON files with `"image": "ipfs://<IMAGE_CID>/1.png"`
4. Upload your metadata folder → copy CID → note as `METADATA_CID`

Option 2 — **IPFS Desktop** (local node):
1. Install IPFS Desktop
2. Import folder → copy CID

Your `baseURI` will be: `ipfs://<METADATA_CID>/`

Example: `ipfs://QmAbcDef123456789.../`

---

## 3️⃣ Deployment Order

> Deploy in this exact sequence.

---

### Step 7 — Deploy `NFTCollection`

**Contract:** `NFTCollection.sol`

Constructor arguments:
```
initialOwner : <your MetaMask wallet address>
_baseURI     : ipfs://<METADATA_CID>/
```

Example:
```
initialOwner : 0xYourWalletAddress
_baseURI     : ipfs://QmXxYyZz.../
```

After deploy:
- Copy address → save as `NFT_COLLECTION_ADDRESS`
- Verify: call `name()` → should return `"Nexus Genesis"`
- Verify: call `symbol()` → should return `"NXSG"`

---

### Step 8 — Deploy `NFTMarketplace`

**Contract:** `NFTMarketplace.sol`

Constructor arguments:
```
_platformToken : <NXS_ADDRESS>
_nftCollection : <NFT_COLLECTION_ADDRESS>
_dexFactory    : <FACTORY_ADDRESS>
_feeBps        : 250                          (= 2.5% fee)
initialOwner   : <your MetaMask wallet address>
```

After deploy:
- Copy address → save as `MARKETPLACE_ADDRESS`

---

### Step 9 — Grant Marketplace Minter Role on NFTCollection

The Marketplace needs permission to call `mintNFT()` on the collection.

In Remix, select `NFTCollection` at `NFT_COLLECTION_ADDRESS`:

```
Function : setApprovedMinter
minter   : <MARKETPLACE_ADDRESS>
approved : true
```

Click **transact** → Confirm in MetaMask

Verify: call `approvedMinters(<MARKETPLACE_ADDRESS>)` → should return `true`

---

### Step 10 — Create Mint Listings on Marketplace

In Remix, select `NFTMarketplace` at `MARKETPLACE_ADDRESS`:

#### Listing 1 — Tier 1 NFT at 500 NXS
```
Function    : createMintListing
priceInNXS  : 500000000000000000000    (= 500 NXS in wei)
```
→ Note `listingId` from event logs → `LISTING_ID_1`

#### Listing 2 — Tier 2 NFT at 200 NXS
```
Function    : createMintListing
priceInNXS  : 200000000000000000000    (= 200 NXS in wei)
```
→ `LISTING_ID_2`

---

### Step 11 — Fund the Marketplace with NXS (for DEX swap tests)

The Marketplace contract itself needs a small NXS balance to handle DEX slippage correctly. Alternatively, this is handled automatically since the contract receives NXS from swaps and immediately distributes it.

**No pre-funding needed** — the contract is designed to route NXS received from swaps directly to sellers/owner in the same transaction.

However, ensure the DEX pools from Part 1 have sufficient liquidity:
- `POOL_NXS_ALPH` should have ≥ 1,000 NXS + 1,000 ALPH liquidity
- `POOL_NXS_BETA` should have ≥ 1,000 NXS + 1,000 BETA liquidity

If not already done, add liquidity to these pools as described in Part 1 guide.

---

## 4️⃣ Testing Guide

### ✅ Test 1 — Buy NFT with NXS

**Setup:** Your wallet needs NXS. Use the faucet or use your minted supply.

1. **Approve** Marketplace to spend your NXS:
   ```
   PlatformToken → approve
   spender : <MARKETPLACE_ADDRESS>
   amount  : 500000000000000000000    (500 NXS)
   ```

2. **Buy the NFT:**
   ```
   NFTMarketplace → buyNFTWithPlatformToken
   listingId : 1
   ```

3. **Verify:**
   - NFTCollection → `ownerOf(1)` → should return your wallet address
   - NFTCollection → `totalSupply()` → should return `1`
   - NFTCollection → `tokenURI(1)` → should return `ipfs://<METADATA_CID>/1.json`

4. **Check fees accumulated:**
   - `NFTMarketplace → accumulatedFees` → should be `12500000000000000000` (= 12.5 NXS, 2.5% of 500)

---

### ✅ Test 2 — Buy NFT with TokenA (ALPH) via DEX Swap

This test exercises the full multi-token payment flow.

**Setup:** Your wallet needs ALPH tokens and `POOL_NXS_ALPH` must have liquidity.

1. **Check price in ALPH first:**
   ```
   NFTMarketplace → calculatePriceInToken
   listingId    : 2
   paymentToken : <TOKEN_A_ADDRESS>
   ```
   → This returns how many ALPH wei you need. Note this value → `ALPH_REQUIRED`

2. **Approve** Marketplace to spend your ALPH:
   ```
   TokenA → approve
   spender : <MARKETPLACE_ADDRESS>
   amount  : <ALPH_REQUIRED>
   ```

3. **Buy with ALPH:**
   ```
   NFTMarketplace → buyNFTWithToken
   listingId    : 2
   paymentToken : <TOKEN_A_ADDRESS>
   ```

4. **Verify:**
   - NFTCollection → `ownerOf(2)` → your wallet address
   - Check your ALPH balance decreased
   - Pool reserves changed (ALPH increased, NXS decreased)
   - `NFTMarketplace → accumulatedFees` increased

---

### ✅ Test 3 — Resale Listing

Test secondary market functionality.

1. **As the NFT owner, approve Marketplace to transfer your NFT:**
   ```
   NFTCollection → approve
   to      : <MARKETPLACE_ADDRESS>
   tokenId : 1
   ```

2. **Create a resale listing:**
   ```
   NFTMarketplace → createResaleListing
   tokenId    : 1
   priceInNXS : 750000000000000000000    (750 NXS)
   ```
   → Note `listingId` → `RESALE_LISTING_ID`

3. **Switch to a second MetaMask account** (the buyer)

4. **Approve Marketplace to spend NXS from buyer account:**
   ```
   PlatformToken → approve
   spender : <MARKETPLACE_ADDRESS>
   amount  : 750000000000000000000
   ```

5. **Buy:**
   ```
   NFTMarketplace → buyNFTWithPlatformToken
   listingId : <RESALE_LISTING_ID>
   ```

6. **Verify:**
   - NFT transferred to buyer's wallet
   - Original seller received 750 NXS minus 2.5% fee = 731.25 NXS
   - accumulatedFees increased by 18.75 NXS

---

### ✅ Test 4 — List All NFTs

```
NFTMarketplace → listAllNFTs()
```

Should return parallel arrays:
- `listingIds`  — all active listing IDs
- `tokenIds`    — token IDs (0 for mint listings)
- `sellers`     — seller addresses (address(0) for mint listings)
- `prices`      — NXS prices in wei
- `types`       — 0 = MINT, 1 = RESALE

---

### ✅ Test 5 — Cancel Listing and Withdraw Fees

1. **Cancel a listing (as owner):**
   ```
   NFTMarketplace → cancelListing
   listingId : 2
   ```
   Verify: `listings(2).active` → false

2. **Withdraw accumulated fees:**
   ```
   NFTMarketplace → withdrawFees
   to : <your wallet address>
   ```
   Verify: NXS balance of your wallet increased, `accumulatedFees` → 0

---

### ✅ Test 6 — Mint NFT with Custom URI

For collections where each token has unique metadata already uploaded:

```
NFTCollection → mintNFTWithURI
recipient  : <your wallet address>
customURI  : ipfs://QmSpecificTokenCID/metadata.json
```

Verify: `tokenURI(<newTokenId>)` returns the custom URI

---

## 5️⃣ DEX Integration — How It Works (Architecture)

```
Buyer wants to pay 500 ALPH for an NFT priced at 200 NXS
                          │
                          ▼
         NFTMarketplace.buyNFTWithToken(listingId, ALPH)
                          │
          ┌───────────────▼───────────────┐
          │  1. dexFactory.getPool(NXS, ALPH) → POOL_NXS_ALPH  │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │  2. _calcPaymentTokenAmount()              │
          │     Using getAmountIn formula:             │
          │     ALPH needed = f(reserveALPH, reserveNXS, 200 NXS)  │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │  3. Pull ALPH from buyer (+ 1% buffer)     │
          │     IERC20(ALPH).transferFrom(buyer, marketplace, alph)  │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │  4. Approve pool + Swap ALPH → NXS         │
          │     LiquidityPool.swapBforA(alph)          │
          │     → receives NXS back                    │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │  5. Verify nxsReceived >= 200 NXS          │
          │     Refund any buffer surplus to buyer     │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │  6. Distribute NXS:                        │
          │     • fee (2.5%) → accumulatedFees         │
          │     • remainder → seller / owner           │
          └───────────────────────────────┘
                          │
          ┌───────────────▼───────────────┐
          │  7. Mint or transfer NFT → buyer           │
          └───────────────────────────────┘
```

---

## 6️⃣ Gas Estimates

| Operation | Estimated Gas |
|---|---|
| Deploy NFTCollection | ~2,500,000 |
| Deploy NFTMarketplace | ~1,200,000 |
| setApprovedMinter() | ~46,000 |
| createMintListing() | ~70,000 |
| createResaleListing() | ~90,000 |
| buyNFTWithPlatformToken() | ~130,000 |
| buyNFTWithToken() (DEX swap) | ~250,000 |
| mintNFT() (from marketplace) | ~150,000 |
| withdrawFees() | ~50,000 |

---

## 7️⃣ Address Checklist

```
# From Part 1
NXS_ADDRESS           : 0x___________
TOKEN_A_ADDRESS       : 0x___________
TOKEN_B_ADDRESS       : 0x___________
FAUCET_ADDRESS        : 0x___________
FACTORY_ADDRESS       : 0x___________
POOL_NXS_ALPH         : 0x___________
POOL_NXS_BETA         : 0x___________

# From Part 2
NFT_COLLECTION_ADDRESS : 0x___________
MARKETPLACE_ADDRESS    : 0x___________
```

---

## 8️⃣ Common Issues & Fixes

| Error | Cause | Fix |
|---|---|---|
| `NFTCollection: caller is not a minter` | Marketplace not granted minter role | Call `setApprovedMinter(marketplace, true)` |
| `Marketplace: no DEX pool for this token` | No pool between NXS and paymentToken | Create pool in DEXFactory first |
| `Marketplace: pool has insufficient NXS liquidity` | Pool reserves too low | Add more liquidity to the pool |
| `ERC721: transfer from incorrect owner` | Seller transferred NFT after listing | Cancel stale listing |
| `Marketplace: not approved to transfer NFT` | NFT not approved for Marketplace | Call `NFTCollection.approve(marketplace, tokenId)` or `setApprovalForAll` |
| `Marketplace: insufficient NXS from swap` | Slippage too high | Pool has very low liquidity — add more |

---

## 🔜 What Comes Next (Part 3)

Part 3 will add:
- **Next.js frontend** with Tailwind CSS
- **ethers.js** contract integration
- Wallet connect (MetaMask)
- NFT gallery, marketplace UI, swap UI, faucet UI
- Full end-to-end user flows

All contracts are designed to be frontend-ready — `listAllNFTs()`, `calculatePriceInToken()`, `previewSwap()`, and event logs provide all data the UI needs without additional indexers.
