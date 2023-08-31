// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SigTest {
    using ECDSA for bytes32;

    address private systemAddress;

    constructor() {
        systemAddress = msg.sender;
    }

    function isDataValid(
        address recipient,
        uint256 amount,
        uint256 timestamp,
        bytes memory signature
    ) public view {
        // Build the hash and check the sig
        // We only accept sigs from the system
        bytes32 msgHash = keccak256(
            abi.encodePacked(msg.sender, recipient, amount, timestamp)
        );
        bytes32 signedHash = msgHash.toEthSignedMessageHash();
        require(
            signedHash.recover(signature) == systemAddress,
            "Invalid signature"
        );
    }
}
