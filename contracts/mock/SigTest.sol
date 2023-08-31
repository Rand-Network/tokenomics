// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SigTest {
    event SignatureUsed(
        address sender,
        address recipient,
        uint256 amount,
        uint256 timestamp,
        uint256 chainId,
        bytes signature
    );
    address private systemAddress;
    mapping(bytes => bool) private _usedSignatures;

    constructor() {
        systemAddress = msg.sender;
    }

    function redeemSignature(
        address recipient,
        uint256 amount,
        uint256 timestamp,
        bytes memory signature
    ) public returns (bool) {
        // Check the length of the signature
        require(signature.length == 65, "VC: Invalid signature length");
        // Check if timestamp is valid and not older than 1 hour
        require(
            block.timestamp <= timestamp + 3600,
            "VC: Signature has expired"
        );
        // Check if the signature has been used before
        require(!_usedSignatures[signature], "VC: Signature already used");
        // Build the hash and check the sig
        bytes32 msgHash = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                amount,
                timestamp,
                block.chainid
            )
        );
        // Append the EIP-191 version byte
        bytes32 signedHash = ECDSA.toEthSignedMessageHash(msgHash);
        // Set the signature as used
        _usedSignatures[signature] = true;
        // Emit the signature
        emit SignatureUsed(
            msg.sender,
            recipient,
            amount,
            timestamp,
            block.chainid,
            signature
        );

        return (ECDSA.recover(signedHash, signature) == systemAddress);
    }
}
