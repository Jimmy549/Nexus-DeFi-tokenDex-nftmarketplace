// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  DEXFactory.sol
//  Factory that deploys and tracks LiquidityPool instances.
//
//  Design decisions:
//    • Token pair addresses are sorted (lower address first) so
//      getPool(A,B) and getPool(B,A) always return the same pool.
//    • Only one pool per unique pair is allowed.
//    • Anyone can create a pool (permissionless DEX model).
// ============================================================

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LiquidityPool.sol";

/**
 * @title  DEXFactory
 * @notice Deploys new LiquidityPool contracts for arbitrary token pairs
 *         and maintains a registry for frontend lookup.
 */
contract DEXFactory is Ownable {

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    /// @dev token0 (sorted) → token1 (sorted) → pool address
    mapping(address => mapping(address => address)) private _pools;

    /// @notice Ordered list of all deployed pool addresses
    address[] private _allPools;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event PoolCreated(
        address indexed token0,
        address indexed token1,
        address pool,
        uint256 totalPools
    );

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    constructor(address initialOwner) Ownable(initialOwner) {}

    // -------------------------------------------------------
    // Core functions
    // -------------------------------------------------------

    /**
     * @notice Deploy a new liquidity pool for the (tokenA, tokenB) pair.
     * @dev    Pair tokens are internally sorted so the factory never
     *         creates duplicate pools for the same economic pair.
     * @param  tokenA Address of the first token
     * @param  tokenB Address of the second token
     * @return pool   Address of the newly created LiquidityPool
     */
    function createPool(address tokenA, address tokenB)
        external
        returns (address pool)
    {
        require(tokenA != address(0) && tokenB != address(0), "Factory: zero address");
        require(tokenA != tokenB, "Factory: identical tokens");

        // Sort tokens for canonical key
        (address token0, address token1) = _sortTokens(tokenA, tokenB);

        require(
            _pools[token0][token1] == address(0),
            "Factory: pool already exists"
        );

        // Deploy new pool
        LiquidityPool newPool = new LiquidityPool(token0, token1);
        pool = address(newPool);

        // Register
        _pools[token0][token1] = pool;
        _allPools.push(pool);

        emit PoolCreated(token0, token1, pool, _allPools.length);
    }

    // -------------------------------------------------------
    // View functions
    // -------------------------------------------------------

    /**
     * @notice Look up the pool address for a token pair.
     *         Returns address(0) if no pool exists yet.
     * @param  tokenA Address of one token
     * @param  tokenB Address of the other token
     * @return pool   Deployed LiquidityPool address (or address(0))
     */
    function getPool(address tokenA, address tokenB)
        external
        view
        returns (address pool)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        pool = _pools[token0][token1];
    }

    /**
     * @notice Returns an array of all deployed pool addresses.
     * @dev    Gas cost grows linearly with pool count.
     *         Suitable for frontends; avoid calling on-chain in loops.
     */
    function getAllPools() external view returns (address[] memory) {
        return _allPools;
    }

    /**
     * @notice Returns the total number of pools created.
     */
    function poolCount() external view returns (uint256) {
        return _allPools.length;
    }

    /**
     * @notice Returns true if a pool exists for the given pair.
     */
    function poolExists(address tokenA, address tokenB) external view returns (bool) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        return _pools[token0][token1] != address(0);
    }

    // -------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------

    /**
     * @dev  Sorts two token addresses so the lower address is always token0.
     *       This gives a canonical, order-independent pair key.
     */
    function _sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
    }
}
