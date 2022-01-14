// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RandVestingNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeERC20 for IERC20;

    IERC20 public RND_TOKEN;
    IERC20 public SM_TOKEN;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SM_ROLE = keccak256("SM_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    struct VestingInvestment {
        uint256 rndTokenAmount;
        uint256 rndClaimedAmount;
        uint256 rndStakedAmount;
        uint256 vestingPeriod;
        uint256 vestingStartTime;
        uint256 cliffPeriod;
        bool exists;
    }
    mapping(uint256 => VestingInvestment) vestingToken;

    // Events

    event ClaimedAmount(uint256 tokenId, address recipient, uint256 amount);
    event StakedAmountModified(uint256 tokenId, uint256 amount);
    event NewInvestmentTokenMinted(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod,
        uint256 tokenId
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        string calldata _erc721_name,
        string calldata _erc721_symbol,
        IERC20 _rndTokenContract,
        IERC20 _smTokenContract
    ) public initializer {
        __ERC721_init(_erc721_name, _erc721_symbol);
        __ERC721Enumerable_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        //_grantRole(SM_ROLE, msg.sender);
        //_grantRole(BACKEND_ROLE, msg.sender);

        RND_TOKEN = _rndTokenContract;
        SM_TOKEN = _smTokenContract;
    }

    // [] limit vesting start by shifting with cliffPeriod
    // [] implement function for SM to modify rndStakedAmount
    // [] calculate claimable amount (_calculateTotalClaimableTokens())
    // [] add claimed amount to rndClaimedAmount in claimTokens()
    // [] when calculating claimable amount substract the staked ones
    // [] create new access roles and add roles to functions
    // [] add events to the contract and assign to functions
    // [] check if SM_TOKEN is needed, remove if not
    // [] limit ERC721 token ownership checks to only owners to keep privacy of investors

    // Function for the SM to increase the staked RND amount
    function modifyStakedAmount(uint256 tokenId, uint256 amount)
        external
        onlyRole(SM_ROLE)
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        vestingToken[tokenId].rndStakedAmount = amount;
    }

    // Claim function for investors to withdraw their vested tokens
    function claimTokens(
        uint256 tokenId,
        address recipient,
        uint256 amount
    ) public returns (bool) {
        require(
            ownerOf(tokenId) == msg.sender || hasRole(BACKEND_ROLE, msg.sender),
            "VC: tokenId is not owned by msg.sender OR not BACKEND_ROLE "
        );

        uint256 claimable = _calculateClaimableTokens(tokenId);
        require(claimable >= amount, "VC: amount is more than claimable");

        vestingToken[tokenId].rndClaimedAmount += amount;
        IERC20(RND_TOKEN).safeTransferFrom(address(this), recipient, amount);
    }

    // Adds claimed amount to the investments
    function _addClaimedTokens(uint256 amount, uint256 tokenId) internal {
        VestingInvestment memory investment = vestingToken[tokenId];
        require(
            investment.rndTokenAmount - investment.rndClaimedAmount >= amount,
            "VC: Amount to be claimed is more than remaining"
        );
        vestingToken[tokenId].rndClaimedAmount -= amount;
    }

    // Calculates the claimable amount as of now for a tokenId
    function _calculateClaimableTokens(uint256 tokenId)
        internal
        view
        returns (uint256)
    {
        uint256 claimableAmount;
        VestingInvestment memory investment = vestingToken[tokenId];
        uint256 vestedPeriods = block.timestamp -
            investment.vestingStartTime +
            investment.cliffPeriod;

        // If there is still not yet vested periods
        if (vestedPeriods <= investment.vestingPeriod) {
            claimableAmount +=
                (vestedPeriods * investment.rndTokenAmount) /
                investment.vestingPeriod -
                investment.rndClaimedAmount -
                investment.rndStakedAmount;
        } else {
            // If all periods are vested already
            claimableAmount +=
                investment.rndTokenAmount -
                investment.rndClaimedAmount -
                investment.rndStakedAmount;
        }

        return claimableAmount;
    }

    // // Calculates the total claimable amount for an investor address
    // function _calculateTotalClaimableTokens(address investor)
    //     internal
    //     view
    //     returns (uint256)
    // {
    //     uint256 claimableAmount;
    //     uint256 balance = balanceOf(investor);

    //     // Calculate total claimable on all investments
    //     for (uint256 i = 0; i < balance; i++) {
    //         uint256 tokenId = tokenOfOwnerByIndex(investor, i);
    //         VestingInvestment memory investment = vestingToken[tokenId];
    //         uint256 vestedPeriods = block.timestamp -
    //             investment.vestingStartTime;

    //         // If there is still not yet vested periods
    //         if (vestedPeriods <= investment.vestingPeriod) {
    //             claimableAmount +=
    //                 (vestedPeriods * investment.rndTokenAmount) /
    //                 investment.vestingPeriod -
    //                 investment.rndClaimedAmount;
    //         } else {
    //             // If all periods are vested already
    //             claimableAmount +=
    //                 investment.rndTokenAmount -
    //                 investment.rndClaimedAmount;
    //         }
    //     }

    //     return claimableAmount;
    // }

    // Mints a token and associates an investment to it and sets tokenURI
    function mintNewInvestment(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod
    ) public returns (uint256) {
        // Incrementing token counter and minting new token to recipient
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(recipient, tokenId);

        // Initializing investment struct and assigning to the newly minted token
        uint256 rndClaimedAmount = 0;
        uint256 rndStakedAmount = 0;
        bool exists = true;
        if (vestingStartTime == 0) {
            vestingStartTime = block.timestamp;
        }

        VestingInvestment memory investment = VestingInvestment(
            rndTokenAmount,
            rndClaimedAmount,
            rndStakedAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
            exists
        );
        vestingToken[tokenId] = investment;

        return tokenId;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function safeMint(address to) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId) internal override(ERC721Upgradeable) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
