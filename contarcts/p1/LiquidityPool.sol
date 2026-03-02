// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  LiquidityPool.sol
//  Constant-product AMM (x * y = k) for a single token pair.
//  Each pool is deployed by DEXFactory.sol.
//
//  Core mechanics:
//    - Liquidity providers (LPs) deposit tokenA + tokenB
//    - LP shares are tracked internally (no ERC-20 LP token for simplicity)
//    - Swappers trade one token for the other at the current price
//    - 0.3 % fee on every swap, kept in the pool (accrues to LPs)
// ============================================================

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title  LiquidityPool
 * @notice Automated Market Maker pool for a (tokenA, tokenB) pair.
 *         Created and owned by DEXFactory.
 */
contract LiquidityPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------
    // Constants
    // -------------------------------------------------------

    /// @notice Swap fee in basis points (30 = 0.3 %)
    uint256 public constant FEE_BPS = 30;
    uint256 private constant BPS    = 10_000;

    /// @notice Minimum liquidity locked forever to prevent divide-by-zero
    uint256 private constant MINIMUM_LIQUIDITY = 1_000;

    // -------------------------------------------------------
    // Immutables
    // -------------------------------------------------------

    address public immutable factory;
    IERC20  public immutable tokenA;
    IERC20  public immutable tokenB;

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    uint256 public reserveA;
    uint256 public reserveB;

    /// @notice Total LP shares issued
    uint256 public totalShares;

    /// @dev Per-LP share balance
    mapping(address => uint256) public sharesOf;

    // -------------------------------------------------------
    // Events
    // -------------------------------------------------------

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 shares
    );
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 shares
    );
    event Swap(
        address indexed trader,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    // -------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------

    modifier onlyFactory() {
        require(msg.sender == factory, "Pool: caller is not factory");
        _;
    }

    // -------------------------------------------------------
    // Constructor
    // -------------------------------------------------------

    /**
     * @param _tokenA Address of token A
     * @param _tokenB Address of token B
     */
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "Pool: zero address");
        require(_tokenA != _tokenB, "Pool: identical tokens");

        factory = msg.sender; // deployer is always DEXFactory
        tokenA  = IERC20(_tokenA);
        tokenB  = IERC20(_tokenB);
    }

    // -------------------------------------------------------
    // Liquidity functions
    // -------------------------------------------------------

    /**
     * @notice Add liquidity to the pool.
     * @dev    On first deposit the ratio is set freely.
     *         Subsequent deposits must match the existing ratio;
     *         the contract accepts `amountA` exactly and computes
     *         the required `amountB` — caller must approve at least
     *         that amount.
     * @param  amountA Desired amount of tokenA (18-decimal wei units)
     * @param  amountB Desired amount of tokenB (only used for initial deposit)
     * @return shares  LP shares minted to msg.sender
     */
    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        nonReentrant
        returns (uint256 shares)
    {
        require(amountA > 0 && amountB > 0, "Pool: amounts must be > 0");

        uint256 actualAmountB = amountB;

        if (totalShares == 0) {
            // ---- First deposit: set initial ratio ----
            shares = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;

            // Lock minimum liquidity forever
            totalShares    = MINIMUM_LIQUIDITY;
            sharesOf[address(0)] = MINIMUM_LIQUIDITY;
        } else {
            // ---- Subsequent deposits: enforce ratio ----
            // Required tokenB given amountA
            uint256 requiredB = (amountA * reserveB) / reserveA;
            require(
                amountB >= requiredB,
                "Pool: insufficient tokenB for ratio"
            );
            actualAmountB = requiredB;

            // Shares proportional to tokenA deposit
            shares = (amountA * totalShares) / reserveA;
        }

        require(shares > 0, "Pool: zero shares minted");

        // Transfer tokens in (caller must have approved this contract)
        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), actualAmountB);

        // Update state
        reserveA       += amountA;
        reserveB       += actualAmountB;
        totalShares    += shares;
        sharesOf[msg.sender] += shares;

        emit LiquidityAdded(msg.sender, amountA, actualAmountB, shares);
    }

    /**
     * @notice Remove liquidity by burning `shares`.
     * @param  shares Number of LP shares to burn
     * @return amountA Amount of tokenA returned
     * @return amountB Amount of tokenB returned
     */
    function removeLiquidity(uint256 shares)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        require(shares > 0,                        "Pool: shares must be > 0");
        require(sharesOf[msg.sender] >= shares,    "Pool: insufficient shares");

        amountA = (shares * reserveA) / totalShares;
        amountB = (shares * reserveB) / totalShares;

        require(amountA > 0 && amountB > 0, "Pool: nothing to withdraw");

        // Update state BEFORE transfers
        sharesOf[msg.sender] -= shares;
        totalShares          -= shares;
        reserveA             -= amountA;
        reserveB             -= amountB;

        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, shares);
    }

    // -------------------------------------------------------
    // Swap functions
    // -------------------------------------------------------

    /**
     * @notice Swap an exact amount of tokenA for tokenB.
     * @param  amountAIn Amount of tokenA to sell
     * @return amountBOut Amount of tokenB received
     */
    function swapAforB(uint256 amountAIn)
        external
        nonReentrant
        returns (uint256 amountBOut)
    {
        require(amountAIn > 0, "Pool: amountAIn must be > 0");
        require(reserveA > 0 && reserveB > 0, "Pool: no liquidity");

        amountBOut = _getAmountOut(amountAIn, reserveA, reserveB);
        require(amountBOut > 0, "Pool: insufficient output");

        tokenA.safeTransferFrom(msg.sender, address(this), amountAIn);
        tokenB.safeTransfer(msg.sender, amountBOut);

        reserveA += amountAIn;
        reserveB -= amountBOut;

        emit Swap(msg.sender, address(tokenA), amountAIn, address(tokenB), amountBOut);
    }

    /**
     * @notice Swap an exact amount of tokenB for tokenA.
     * @param  amountBIn Amount of tokenB to sell
     * @return amountAOut Amount of tokenA received
     */
    function swapBforA(uint256 amountBIn)
        external
        nonReentrant
        returns (uint256 amountAOut)
    {
        require(amountBIn > 0, "Pool: amountBIn must be > 0");
        require(reserveA > 0 && reserveB > 0, "Pool: no liquidity");

        amountAOut = _getAmountOut(amountBIn, reserveB, reserveA);
        require(amountAOut > 0, "Pool: insufficient output");

        tokenB.safeTransferFrom(msg.sender, address(this), amountBIn);
        tokenA.safeTransfer(msg.sender, amountAOut);

        reserveB += amountBIn;
        reserveA -= amountAOut;

        emit Swap(msg.sender, address(tokenB), amountBIn, address(tokenA), amountAOut);
    }

    // -------------------------------------------------------
    // View / preview functions
    // -------------------------------------------------------

    /**
     * @notice Returns the current reserves of the pool.
     * @return _reserveA Current tokenA reserve
     * @return _reserveB Current tokenB reserve
     */
    function getReserves() external view returns (uint256 _reserveA, uint256 _reserveB) {
        return (reserveA, reserveB);
    }

    /**
     * @notice Returns the spot price of tokenA denominated in tokenB.
     *         i.e. how many tokenB you get per 1 whole tokenA (in 1e18 units).
     * @dev    Returns 0 if pool has no liquidity.
     */
    function getPrice() external view returns (uint256 price) {
        if (reserveA == 0) return 0;
        // Price = reserveB / reserveA  (scaled by 1e18 for precision)
        price = (reserveB * 1e18) / reserveA;
    }

    /**
     * @notice Preview how much tokenB you receive for `amountAIn` of tokenA.
     * @param  amountAIn Amount of tokenA in (wei)
     * @return amountBOut Expected tokenB out (after 0.3 % fee)
     */
    function previewSwap(uint256 amountAIn)
        external
        view
        returns (uint256 amountBOut)
    {
        if (reserveA == 0 || reserveB == 0) return 0;
        amountBOut = _getAmountOut(amountAIn, reserveA, reserveB);
    }

    /**
     * @notice Preview how much tokenA you receive for `amountBIn` of tokenB.
     * @param  amountBIn Amount of tokenB in (wei)
     * @return amountAOut Expected tokenA out (after 0.3 % fee)
     */
    function previewSwapReverse(uint256 amountBIn)
        external
        view
        returns (uint256 amountAOut)
    {
        if (reserveA == 0 || reserveB == 0) return 0;
        amountAOut = _getAmountOut(amountBIn, reserveB, reserveA);
    }

    // -------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------

    /**
     * @dev  AMM output formula with fee:
     *         amountOut = (amountIn * fee_adjusted * reserveOut)
     *                   / (reserveIn * BPS + amountIn * fee_adjusted)
     *       where fee_adjusted = BPS - FEE_BPS = 9970 (= 99.7 %)
     */
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(reserveIn > 0 && reserveOut > 0, "Pool: empty reserves");

        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS); // multiply by 9970
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = reserveIn * BPS + amountInWithFee;
        amountOut               = numerator / denominator;
    }

    /**
     * @dev Integer square root (Babylonian method)
     */
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
