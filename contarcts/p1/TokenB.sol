// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  TokenB.sol
//  Standard ERC-20 token used for DEX pool testing
//  Name   : BetaToken
//  Symbol : BETA
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  TokenB
 * @notice Testing token B for DEX liquidity pools.
 *         Deployer receives initial supply and can mint more.
 */
contract TokenB is ERC20, Ownable {

    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;

    event TokensMinted(address indexed to, uint256 amount);

    constructor(address initialOwner)
        ERC20("BetaToken", "BETA")
        Ownable(initialOwner)
    {
        _mint(initialOwner, 1_000_000 * 10 ** decimals());
    }

    /**
     * @notice Mint tokens to any address (owner only).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "TokenB: mint to zero address");
        require(amount > 0,       "TokenB: amount must be > 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "TokenB: exceeds max supply");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
}
