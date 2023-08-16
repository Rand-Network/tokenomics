// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./RandToken.sol";

/// @title Rand.network ERC20 Token contract
/// @author @adradr - Adrian Lenard
/// @notice Default implementation of the OpenZeppelin ERC20 standard to be used for the RND token
contract RandTokenV2 is RandToken {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function testUpgrade(uint256 _amount) public view returns (uint256) {
        return _amount;
    }
}
