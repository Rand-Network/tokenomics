// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract VestingControllerERC721 is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public RND_TOKEN;
    IERC20Upgradeable public SM_TOKEN;
    string public baseURI;

    uint256 public PERIOD_SECONDS;
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
        //uint256 cliffPeriod;
        bool exists;
    }
    mapping(uint256 => VestingInvestment) vestingToken;

    // Events
    event BaseURIChanged(string baseURI);
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
        IERC20Upgradeable _rndTokenContract,
        IERC20Upgradeable _smTokenContract,
        uint256 _periodSeconds
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
        PERIOD_SECONDS = _periodSeconds;
    }

    // [] implement setAllowanceForSM
    // [] create interface contract for VCERC721.sol
    // [] create new access roles and add roles to functions
    // [] check if SM_TOKEN is needed, remove if not
    // [] limit ERC721 token info checks to only owners to keep privacy of investors? should we?
    // [] should we store the block.timestamp when the investment was minted?
    // [] should we keep _calculateTotalClaimableTokens? (checks all tokens of an address)

    // [x] tokenURI
    // [x] have a period_seconds variable to store how much each period must be multiplied
    // [x] limit vesting start by shifting with cliffPeriod
    // [x] implement function for SM to modify rndStakedAmount
    // [x] calculate claimable amount (_calculateTotalClaimableTokens())
    // [x] add claimed amount to rndClaimedAmount in claimTokens()
    // [x] when calculating claimable amount substract the staked ones
    // [x] add events to the contract and assign to functions
    // [x] implement view function to see investments (access control)

    // View functions to get investment details
    function getClaimableTokens(uint256 tokenId) public view returns (uint256) {
        return _calculateClaimableTokens(tokenId);
    }

    function getInvestmentInfo(uint256 tokenId)
        public
        view
        returns (
            uint256 rndTokenAmount,
            uint256 vestingPeriod,
            uint256 vestingStartTime //uint256 cliffPeriod
        )
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        rndTokenAmount = vestingToken[tokenId].rndTokenAmount;
        vestingPeriod = vestingToken[tokenId].vestingPeriod;
        vestingStartTime = vestingToken[tokenId].vestingStartTime;
        //uint256 cliffPeriod = vestingToken[tokenId].cliffPeriod;
    }

    // Function for SM to increase the staked RND amount
    function modifyStakedAmount(uint256 tokenId, uint256 amount)
        external
        onlyRole(SM_ROLE)
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        vestingToken[tokenId].rndStakedAmount = amount;
        emit StakedAmountModified(tokenId, amount);
    }

    // Function to allow SM to transfer funds when vesting investor stakes
    function setAllowanceForSM(uint256 amount) external onlyRole(SM_ROLE) {}

    // Claim function to withdraw vested tokens
    function claimTokens(
        uint256 tokenId,
        address recipient,
        uint256 amount
    ) public {
        require(
            ownerOf(tokenId) == msg.sender || hasRole(BACKEND_ROLE, msg.sender),
            "VC: tokenId is not owned by msg.sender OR not BACKEND_ROLE "
        );

        uint256 claimable = _calculateClaimableTokens(tokenId);
        require(claimable >= amount, "VC: amount is more than claimable");

        vestingToken[tokenId].rndClaimedAmount += amount;
        IERC20Upgradeable(RND_TOKEN).safeTransferFrom(
            address(this),
            recipient,
            amount
        );
        emit ClaimedAmount(tokenId, recipient, amount);
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
        returns (uint256 claimableAmount)
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        VestingInvestment memory investment = vestingToken[tokenId];
        uint256 vestedPeriods = block.timestamp - investment.vestingStartTime;

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
    }

    // // Calculates the total claimable amount for an investor address
    // function _calculateTotalClaimableTokens(address investor)
    //     internal
    //     view
    //     returns (uint256 claimableAmount)
    // {
    //     require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
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
    // }

    // Mints a token and associates an investment to it and sets tokenURI
    function mintNewInvestment(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod
    ) public onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        // Incrementing token counter and minting new token to recipient
        tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(recipient, tokenId);

        // Initializing investment struct and assigning to the newly minted token
        vestingPeriod = vestingPeriod * PERIOD_SECONDS;
        vestingStartTime += cliffPeriod;
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
            exists
        );
        vestingToken[tokenId] = investment;

        emit NewInvestmentTokenMinted(
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
            tokenId
        );
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

    function setBaseURI(string memory newURI) public onlyRole(MINTER_ROLE) {
        baseURI = newURI;
        emit BaseURIChanged(baseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
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
