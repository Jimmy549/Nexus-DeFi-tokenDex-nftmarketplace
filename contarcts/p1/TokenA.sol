// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  TokenA.sol
//  Standard ERC-20 token used for DEX pool testing
//  Name   : AlphaToken
//  Symbol : ALPH
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  TokenA
 * @notice Testing token A for DEX liquidity pools.
 *         Deployer receives initial supply and can mint more.
 */
contract TokenA is ERC20, Ownable {

    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;

    event TokensMinted(address indexed to, uint256 amount);

    constructor(address initialOwner)
        ERC20("AlphaToken", "ALPH")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice Mint tokens to any address (owner only).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "TokenA: mint to zero address");
        require(amount > 0,       "TokenA: amount must be > 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "TokenA: exceeds max supply");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}
