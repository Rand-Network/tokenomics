// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../ecosystem/SignatureVerification.sol";

/// @title Rand.network Mock contract to test signature verification
/// @author @adradr - Adrian Lenard

contract SigTest is SignatureVerification {
    address public signerAddress;

    constructor() {
        signerAddress = msg.sender;
    }

    function redeemSignatureTest(
        address recipient,
        uint256 amount,
        uint256 timestamp,
        bytes memory signature
    ) public returns (bool) {
        return
            _redeemSignature(
                recipient,
                amount,
                timestamp,
                signature,
                signerAddress
            );
    }
}
