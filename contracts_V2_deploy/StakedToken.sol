// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./SafetyModuleERC20.sol";

/// @title Rand.network ERC20 Safety Module
/// @author @adradr - Adrian Lenard
/// @notice Safety Module instance for the staked Rand Balance Pool Tokens

contract StakedToken is SafetyModuleERC20 {
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
            REGISTRY.POOL_TOKEN(),
            __cooldown_seconds,
            __unstake_window,
            __registry
        );
    }
}
