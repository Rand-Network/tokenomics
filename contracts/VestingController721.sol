// Rand.network - Vesting Controller ERC-721 Implementation
//
// TODO: override required methods to give investors privacy

pragma solidity 0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract VestingController is ERC721, ERC721Enumerable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => VestingInvestment) vestingToken;

    struct VestingInvestment {
        uint256 tokenAmount;
        uint8 vestingPeriod;
        uint8 vestingStartTime;
        uint8 cliffStartTime;
        uint256 dailyTokenAmount;
    }

    constructor(string memory name, string memory symbol)
        ERC721(name, symbol)
    {}

    function addInvestment(
        address recipient,
        uint8 tokenId,
        uint256 tokenAmount,
        uint8 vestingPeriod,
        uint8 vestingStartTime,
        uint8 cliffStartTime,
        uint256 dailyTokenAmount
    ) public returns (uint256) {
        // Incrementing token counter and minting new token to recipient
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(recipient, newTokenId);

        // Initializing investment struct and assigning to the newly minted token
        VestingInvestment memory investment = VestingInvestment(
            tokenId,
            tokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffStartTime,
            dailyTokenAmount
        );
        vestingToken[newTokenId] = investment;

        return newTokenId;
    }

    // Get balanceOf(investor) and iterate over like _ownedTokens[address][i]
    function _calculateTotalLockedAmount(address investor)
        internal
        view
        returns (uint256 totalLockedAmount)
    {
        uint256 totalLockedAmount = 0;
        uint256 balance = balanceOf(investor);

        for (i = 0; i < balance; i++) {
            uint8 tokenId = _ownedTokens[investor][i];
            totalLockedAmount += _calculateLockedAmount(tokenId);
        }
        return totalLockedAmount;
    }

    // Calculates the locked amount for an investment token
    function _calculateLockedAmount(uint256 tokenId)
        internal
        view
        returns (uint256 lockedAmount)
    {
        VestingInvestment memory investment = vestingToken[tokenId];
        uint256 vestedPeriods = block.timestamp - investment.vestingStartTime;

        // Check if there is no overflow, else set locked to zero
        if (vestedPeriods <= investment.vestingPeriod) {
            uint256 locked = investment.tokenAmount -
                (vestedPeriods * investment.dailyTokenAmount);
        } else {
            locked = 0;
        }
        return lockedAmount;
    }
}
