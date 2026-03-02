// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  PlatformToken.sol
//  Production ERC-20 token built on OpenZeppelin v5
//  Name   : NexusToken
//  Symbol : NXS
//  Supply : 1,000,000 NXS (minted to deployer on construction)
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  PlatformToken
 * @notice Core utility token for the Nexus DeFi platform.
 *         Used by the faucet, DEX liquidity pools, and (later) the NFT marketplace.
 * @dev    Inherits OpenZeppelin ERC20 + Ownable.
 *         Only the contract owner (deployer) may mint new tokens.
 */
contract PlatformToken is ERC20, Ownable {

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @notice Hard cap — total supply will never exceed 100 million NXS
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    /// @notice Emitted whenever the owner mints new tokens
    event TokensMinted(address indexed to, uint256 amount);

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param initialOwner Address that will receive the initial supply and
     *                     hold the owner role (typically the deployer).
     */
    constructor(address initialOwner)
        ERC20("NexusToken", "NXS")
        Ownable(initialOwner)
    {
        // Mint 1,000,000 NXS to the deployer
        _mint(initialOwner, 1_000_000 * 10 ** decimals());
    }

    // -------------------------------------------------------
    // Owner functions
    // -------------------------------------------------------

    /**
     * @notice Mint new tokens to any address.
     * @dev    Reverts if the new total supply would exceed MAX_SUPPLY.
     * @param  to     Recipient address (must not be zero)
     * @param  amount Number of tokens to mint (in wei, i.e. 18-decimal units)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "PlatformToken: mint to zero address");
        require(amount > 0,       "PlatformToken: amount must be > 0");
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "PlatformToken: exceeds max supply"
        );

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // -------------------------------------------------------
    // View helpers (ERC-20 functions are inherited from OZ)
    // -------------------------------------------------------
    // transfer()        — inherited
    // approve()         — inherited
    // transferFrom()    — inherited
    // balanceOf()       — inherited
    // totalSupply()     — inherited
    // decimals()        — inherited, returns 18
    // -------------------------------------------------------
}
