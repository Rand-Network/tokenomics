// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../interfaces/IAddressRegistry.sol";

/// @title Rand.network Address Registry helper
/// @author @adradr - Adrian Lenard
/// @notice Stores constant names for ecosystem contracts
/// @dev Inherited by all ecosystem contracts that uses Address Registry

contract AddressConstants {
    IAddressRegistry public REGISTRY;

    string public constant MULTISIG = "MS";
    string public constant RAND_TOKEN = "RND";
    string public constant VESTING_CONTROLLER = "VC";
    string public constant SAFETY_MODULE = "SM";
    string public constant ECOSYSTEM_RESERVE = "RES";
    string public constant GOVERNANCE = "GOV";
    string public constant INVESTOR_NFT = "NFT";
    string public constant BPT_TOKEN = "BPT";
    string public constant OPENZEPPELIN_DEFENDER = "OZ";
}
