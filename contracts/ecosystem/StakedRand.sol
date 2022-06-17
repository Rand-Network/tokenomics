// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./SafetyModuleERC20.sol";

/// @title Rand.network ERC20 Safety Module
/// @author @adradr - Adrian Lenard
/// @notice Safety Module instance for the staked Rand Token

contract StakedRand is SafetyModuleERC20 {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param __name Name of the token like `Staked Rand Token ERC20`
    /// @param __symbol Short symbol like `sRND`
    /// @param __cooldown_seconds is the period of cooldown before redeeming in seconds
    /// @param __unstake_window is the period after cooldown in which redeem can happen in seconds
    /// @param __registry is the address of the AddressRegistry
    function initialize(
        string memory __name,
        string memory __symbol,
        uint256 __cooldown_seconds,
        uint256 __unstake_window,
        IAddressRegistry __registry
    ) public initializer {
        __SM_init(
            __name,
            __symbol,
            RAND_TOKEN,
            __cooldown_seconds,
            __unstake_window,
            __registry
        );
    }

    /// @notice Exposing staking for vesting investors
    /// @dev Interacts with the vesting controller
    /// @param tokenId is the id of the vesting token to stake
    /// @param amount is the uint256 amount to stake
    function stake(uint256 tokenId, uint256 amount) public {
        _stake(tokenId, amount);
    }

    /// @notice Exposing redeem function of the staked token with vesting, updates rewards and transfers funds
    /// @dev Only used for vesting token redemption, needs to wait cooldown
    /// @param amount is the uint256 amount to redeem
    /// @param tokenId is the id of the vesting token to redeem
    function redeem(uint256 tokenId, uint256 amount) public {
        _redeem(tokenId, amount);
    }
}
