# 🚀 Part 1 — Deployment, Testing & Usage Guide
## Nexus DeFi Platform — Foundation Layer

---

## 📁 Contract Overview

| File | Contract | Purpose |
|---|---|---|
| `PlatformToken.sol` | `PlatformToken` (NXS) | Core ERC-20, mintable by owner |
| `TokenA.sol` | `TokenA` (ALPH) | Test token A for DEX |
| `TokenB.sol` | `TokenB` (BETA) | Test token B for DEX |
| `TokenFaucet.sol` | `TokenFaucet` | 100 NXS / 24 h per user |
| `DEXFactory.sol` | `DEXFactory` | Creates & tracks pool contracts |
| `LiquidityPool.sol` | `LiquidityPool` | AMM pool (x * y = k), 0.3 % fee |

---

## 1️⃣ Prerequisites

### Install MetaMask
1. Install the MetaMask browser extension at metamask.io
2. Create or import a wallet
3. Connect to a test network (recommended: **Sepolia** or **Polygon Mumbai**)
4. Get test ETH from a faucet:
   - Sepolia: https://sepoliafaucet.com
   - Mumbai: https://mumbaifaucet.com

### Open Remix IDE
- Navigate to https://remix.ethereum.org
- In the **File Explorer** panel, create a folder called `nexus/`
- Upload all six `.sol` files into this folder

---

## 2️⃣ Compiler Setup

In Remix, open the **Solidity Compiler** tab (left sidebar):

```
Compiler version : 0.8.20  (or any 0.8.20+)
EVM version      : paris
Optimization     : ✅ Enabled
Runs             : 200
```

**Install OpenZeppelin** — in the terminal panel at the bottom of Remix:
```bash
npm install @openzeppelin/contracts
```
Or in Remix use the dependency manager plugin to add:
```
@openzeppelin/contracts@5.0.0
```

Compile each file individually. Confirm **0 errors** before proceeding.

---

## 3️⃣ Connect MetaMask to Remix

1. In Remix, open the **Deploy & Run Transactions** tab
2. In the **Environment** dropdown, select:  
   `Injected Provider — MetaMask`
3. MetaMask will pop up → click **Connect**
4. Confirm the correct account and network are shown in Remix

---

## 4️⃣ Deployment Order

> ⚠️ **Order matters.** Deploy strictly in the sequence below.

---

### Step 1 — Deploy `PlatformToken`

**Contract:** `PlatformToken.sol`

Constructor argument:
```
initialOwner: <your MetaMask wallet address>
```

After deploy:
- Copy the deployed address → save as `NXS_ADDRESS`
- The deployer wallet now holds **1,000,000 NXS**

---

### Step 2 — Deploy `TokenA`

**Contract:** `TokenA.sol`

Constructor argument:
```
initialOwner: <your MetaMask wallet address>
```

After deploy:
- Copy address → save as `TOKEN_A_ADDRESS`
- Your wallet holds **1,000,000 ALPH**

---

### Step 3 — Deploy `TokenB`

**Contract:** `TokenB.sol`

Constructor argument:
```
initialOwner: <your MetaMask wallet address>
```

After deploy:
- Copy address → save as `TOKEN_B_ADDRESS`
- Your wallet holds **1,000,000 BETA**

---

### Step 4 — Deploy `TokenFaucet`

**Contract:** `TokenFaucet.sol`

Choose a mode:

| Mode | `usesMint` param | How tokens are sourced |
|---|---|---|
| **A — Mint mode** (recommended) | `true` | Faucet calls `NXS.mint()` directly |
| **B — Transfer mode** | `false` | Faucet holds pre-funded NXS balance |

Constructor arguments:
```
tokenAddress : <NXS_ADDRESS>
usesMint     : true        (or false for Mode B)
initialOwner : <your wallet address>
```

After deploy:
- Copy address → save as `FAUCET_ADDRESS`

**If using Mode A (mint):**  
Transfer ownership of PlatformToken to the faucet so it can mint:
```
PlatformToken → transferOwnership(<FAUCET_ADDRESS>)
```
⚠️ After this, your wallet can no longer mint NXS directly.  
Optionally, use a multisig or keep ownership and use Mode B instead.

**If using Mode B (transfer):**  
Send NXS tokens to the faucet contract so it has a balance to distribute:
```
PlatformToken → transfer(<FAUCET_ADDRESS>, 100000000000000000000000)
// = 100,000 NXS (enough for 1,000 claims)
```

---

### Step 5 — Deploy `DEXFactory`

**Contract:** `DEXFactory.sol`

Constructor argument:
```
initialOwner: <your MetaMask wallet address>
```

After deploy:
- Copy address → save as `FACTORY_ADDRESS`

---

### Step 6 — Create Liquidity Pools

**Contract:** `DEXFactory`  
**Function:** `createPool`

#### Pool 1 — NXS / ALPH
```
tokenA: <NXS_ADDRESS>
tokenB: <TOKEN_A_ADDRESS>
```
Click **transact** → MetaMask → Confirm  
→ Note the pool address from the transaction logs → `POOL_NXS_ALPH`

#### Pool 2 — NXS / BETA
```
tokenA: <NXS_ADDRESS>
tokenB: <TOKEN_B_ADDRESS>
```
→ Note pool address → `POOL_NXS_BETA`

#### Pool 3 — ALPH / BETA (optional)
```
tokenA: <TOKEN_A_ADDRESS>
tokenB: <TOKEN_B_ADDRESS>
```
→ Note pool address → `POOL_ALPH_BETA`

---

## 5️⃣ Testing Guide

### ✅ Test 1 — Faucet Claim

1. Open `TokenFaucet` in Remix (at `FAUCET_ADDRESS`)
2. Call `claimTokens()` — should succeed
3. Call `getTotalClaimed(<your address>)` → should return `100000000000000000000` (100 NXS)
4. Call `claimTokens()` again immediately → should **revert** with cooldown error
5. Call `getTimeUntilNextClaim(<your address>)` → should return ~86400 seconds

---

### ✅ Test 2 — Add Liquidity

**Setup:** Approve the pool to spend your tokens first.

For `POOL_NXS_ALPH`:

1. In `PlatformToken`, call `approve`:
   ```
   spender : <POOL_NXS_ALPH>
   amount  : 1000000000000000000000   (= 1,000 NXS)
   ```

2. In `TokenA`, call `approve`:
   ```
   spender : <POOL_NXS_ALPH>
   amount  : 1000000000000000000000   (= 1,000 ALPH)
   ```

3. In `LiquidityPool` (at POOL_NXS_ALPH), call `addLiquidity`:
   ```
   amountA : 1000000000000000000000   (1,000 NXS)
   amountB : 1000000000000000000000   (1,000 ALPH)
   ```

4. Call `getReserves()` → should return `[1000e18, 1000e18]`
5. Call `getPrice()` → should return `1000000000000000000` (= 1.0 × 10¹⁸, meaning 1 NXS = 1 ALPH)

---

### ✅ Test 3 — Swap

Still using `POOL_NXS_ALPH`:

1. Preview the swap first — call `previewSwap`:
   ```
   amountAIn : 100000000000000000000   (= 100 NXS)
   ```
   Expected: approximately `90.6 ALPH` (because of the 0.3 % fee and AMM slippage)

2. Approve the pool to spend 100 more NXS:
   ```
   PlatformToken → approve(<POOL_NXS_ALPH>, 100000000000000000000)
   ```

3. Call `swapAforB`:
   ```
   amountAIn : 100000000000000000000
   ```

4. Check your ALPH balance increased, your NXS balance decreased
5. Call `getReserves()` — NXS reserve should be higher, ALPH reserve lower

---

### ✅ Test 4 — Remove Liquidity

1. Call `sharesOf(<your address>)` to see your LP shares
2. Call `removeLiquidity` with half your shares
3. Confirm NXS and ALPH are returned to your wallet
4. Call `getReserves()` — reserves should have decreased proportionally

---

### ✅ Test 5 — Factory Registry

1. Call `DEXFactory.getAllPools()` — should list all deployed pool addresses
2. Call `DEXFactory.getPool(<NXS_ADDRESS>, <TOKEN_A_ADDRESS>)` — should return `POOL_NXS_ALPH`
3. Call `DEXFactory.poolCount()` — should return 2 (or 3 if you created the ALPH/BETA pool)
4. Call `DEXFactory.poolExists(<NXS_ADDRESS>, <TOKEN_A_ADDRESS>)` — should return `true`

---

## 6️⃣ Example Usage Guide

### For a User Claiming Tokens
```
1. Go to faucet UI (Part 2 will add this)
2. Click "Claim 100 NXS"
3. Confirm MetaMask transaction (~50k gas)
4. Wait 24 hours before next claim
```

### For a Liquidity Provider
```
1. Approve tokenA + tokenB on the pool contract
2. Call addLiquidity(amountA, amountB)
3. Your shares are tracked in sharesOf[address]
4. Call removeLiquidity(shares) to withdraw proportional tokens + earned fees
```

### For a Trader
```
1. Call previewSwap(amountIn) to see expected output
2. Approve the input token on the pool contract
3. Call swapAforB(amountIn) or swapBforA(amountIn)
4. Tokens arrive in your wallet in the same transaction
```

---

## 7️⃣ Gas Estimates (Sepolia)

| Operation | Estimated Gas |
|---|---|
| Deploy PlatformToken | ~800,000 |
| Deploy TokenFaucet | ~400,000 |
| Deploy DEXFactory | ~600,000 |
| createPool() | ~900,000 (deploys LiquidityPool) |
| addLiquidity() first time | ~150,000 |
| addLiquidity() subsequent | ~100,000 |
| swapAforB() | ~80,000 |
| removeLiquidity() | ~90,000 |
| claimTokens() | ~60,000 |

---

## 8️⃣ Common Issues & Fixes

| Error | Cause | Fix |
|---|---|---|
| `ERC20: insufficient allowance` | Pool not approved | Call `approve(poolAddress, amount)` first |
| `Pool: pool already exists` | Duplicate pair | Call `getPool()` to find existing pool |
| `Faucet: cooldown active` | Claimed within 24h | Wait 24 hours |
| `Pool: amounts must be > 0` | Passed 0 as argument | Use correct amounts in wei (multiply by 1e18) |
| `Factory: identical tokens` | tokenA == tokenB | Use two different token addresses |
| Transaction out of gas | Gas limit too low | Increase gas limit in MetaMask advanced settings |

---

## 9️⃣ Address Checklist (fill in as you deploy)

```
NXS_ADDRESS       : 0x___________
TOKEN_A_ADDRESS   : 0x___________
TOKEN_B_ADDRESS   : 0x___________
FAUCET_ADDRESS    : 0x___________
FACTORY_ADDRESS   : 0x___________
POOL_NXS_ALPH     : 0x___________
POOL_NXS_BETA     : 0x___________
POOL_ALPH_BETA    : 0x___________  (optional)
```

---

## 🔜 What Comes Next (Part 2)

Part 2 will add:
- ERC-721 NFT Collection contract
- NFT Marketplace contract
- Multi-token payment integration with the DEX
- Frontend UI connecting to these contracts

All Part 1 contracts are designed to integrate cleanly with Part 2 components.
