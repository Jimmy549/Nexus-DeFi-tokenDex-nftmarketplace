// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  TokenFaucet.sol
//  Distributes free NXS tokens to users once every 24 hours.
//  The faucet calls PlatformToken.mint() directly, so the
//  faucet address must be granted the owner role on
//  PlatformToken — OR the owner must approve it differently.
//
//  Recommended setup (simpler & safer):
//    1. Deploy PlatformToken
//    2. Deploy TokenFaucet (pass PlatformToken address)
//    3. Call PlatformToken.transferOwnership(faucetAddress)
//       — OR keep owner as deployer and top up faucet with
//         pre-minted tokens (alternative mode below).
//
//  This contract supports BOTH modes:
//    Mode A — Faucet is token owner   → calls token.mint()
//    Mode B — Faucet holds a balance  → calls token.transfer()
//
//  Mode is selected at deploy time via `usesMint` flag.
// ============================================================

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPlatformToken {
    function mint(address to, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title  TokenFaucet
 * @notice Lets any address claim CLAIM_AMOUNT NXS once every 24 hours.
 *         Tracks per-user claim history and enforces cooldown.
 */
contract TokenFaucet is Ownable, ReentrancyGuard {

    // -------------------------------------------------------
    // Constants & Immutables
    // -------------------------------------------------------

    /// @notice Fixed amount distributed per claim (100 NXS)
    uint256 public constant CLAIM_AMOUNT = 100 * 10 ** 18;

    /// @notice Cooldown between claims per user (24 hours)
    uint256 public constant COOLDOWN = 24 hours;

    /// @notice Platform token contract
    IPlatformToken public immutable token;

    /// @notice If true, faucet mints tokens; if false, it transfers from its balance
    bool public immutable usesMint;

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @dev Maps user address → timestamp of their last claim
    mapping(address => uint256) private _lastClaimed;

    /// @dev Maps user address → cumulative amount claimed
    mapping(address => uint256) private _totalClaimed;

    /// @notice Global total tokens distributed by this faucet
    uint256 public globalTotalDistributed;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event TokensClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event FaucetFunded(address indexed funder, uint256 amount);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param tokenAddress  Address of the PlatformToken contract
     * @param _usesMint     True → faucet calls mint(); False → faucet transfers
     * @param initialOwner  Owner of this faucet contract
     */
    constructor(
        address tokenAddress,
        bool    _usesMint,
        address initialOwner
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "Faucet: invalid token address");
        token    = IPlatformToken(tokenAddress);
        usesMint = _usesMint;
    }

    // -------------------------------------------------------
    // User functions
    // -------------------------------------------------------

    /**
     * @notice Claim CLAIM_AMOUNT tokens.
     *         Reverts if called within 24 hours of a previous claim.
     * @dev    Uses ReentrancyGuard to prevent re-entrancy attacks.
     */
    function claimTokens() external nonReentrant {
        address user = msg.sender;

        require(
            block.timestamp >= _lastClaimed[user] + COOLDOWN,
            "Faucet: cooldown active — try again later"
        );

        // Update state BEFORE external call (checks-effects-interactions)
        _lastClaimed[user]  = block.timestamp;
        _totalClaimed[user] += CLAIM_AMOUNT;
        globalTotalDistributed += CLAIM_AMOUNT;

        // Distribute tokens
        if (usesMint) {
            token.mint(user, CLAIM_AMOUNT);
        } else {
            require(
                token.balanceOf(address(this)) >= CLAIM_AMOUNT,
                "Faucet: insufficient token balance — please refill"
            );
            require(
                token.transfer(user, CLAIM_AMOUNT),
                "Faucet: transfer failed"
            );
        }

        emit TokensClaimed(user, CLAIM_AMOUNT, block.timestamp);
    }

    // -------------------------------------------------------
    // View functions
    // -------------------------------------------------------

    /**
     * @notice Returns seconds until `user` can claim again.
     *         Returns 0 if user is eligible right now.
     * @param  user The address to query
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaim = _lastClaimed[user] + COOLDOWN;
        if (block.timestamp >= nextClaim) return 0;
        return nextClaim - block.timestamp;
    }

    /**
     * @notice Returns total tokens ever claimed by `user` from this faucet.
     * @param  user The address to query
     */
    function getTotalClaimed(address user) external view returns (uint256) {
        return _totalClaimed[user];
    }

    /**
     * @notice Returns the Unix timestamp when `user` last claimed.
     *         Returns 0 if user has never claimed.
     * @param  user The address to query
     */
    function getLastClaimTime(address user) external view returns (uint256) {
        return _lastClaimed[user];
    }

    /**
     * @notice Returns whether `user` is currently eligible to claim.
     * @param  user The address to query
     */
    function canClaim(address user) external view returns (bool) {
        return block.timestamp >= _lastClaimed[user] + COOLDOWN;
    }

    // -------------------------------------------------------
    // Owner functions
    // -------------------------------------------------------

    /**
     * @notice (Mode B only) Allows the owner to rescue stuck tokens
     *         from the faucet contract.
     * @param  amount Amount to withdraw to owner address
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(!usesMint, "Faucet: not needed in mint mode");
        require(
            token.transfer(owner(), amount),
            "Faucet: withdrawal failed"
        );
    }
}
