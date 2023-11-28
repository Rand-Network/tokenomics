// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../ecosystem/SignatureVerification_V2.sol";

/// @title Rand.network Mock contract to test signature verification
/// @author @adradr - Adrian Lenard

contract SigTest_V2 is SignatureVerification_V2 {
    address public signerAddress;

    constructor() {
        signerAddress = msg.sender;
    }

    function redeemSignatureTest(
        address recipient,
        uint256 rndAmount,
        uint256 vestingStartTime,
        uint256 vestingPeriod,
        uint256 cliffPeriod,
        uint8 nftLevel,
        uint256 timestamp,
        bytes memory signature
    ) public returns (bool) {
        return
            _redeemSignature(
                recipient,
                rndAmount,
                vestingStartTime,
                vestingPeriod,
                cliffPeriod,
                nftLevel,
                timestamp,
                signature,
                signerAddress
            );
    }
}
