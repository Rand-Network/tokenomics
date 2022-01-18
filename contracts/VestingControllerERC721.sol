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
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant SM_ROLE = keccak256("SM_ROLE");
    bytes32 public constant INVESTOR_ROLE = keccak256("INVESTOR_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    struct VestingInvestment {
        uint256 rndTokenAmount;
        uint256 rndClaimedAmount;
        uint256 rndStakedAmount;
        uint256 vestingPeriod;
        uint256 vestingStartTime;
        uint256 mintTimestamp;
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
        uint256 mintTimestamp,
        uint256 tokenId
    );
    event FetchedRND(uint256 amount);
    event MultiSigAddressUpdated(address newAddress);
    event RNDAddressUpdated(IERC20Upgradeable newAddress);

    // Used to set the owner of RNDs
    address public MultiSigRND;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        string calldata _erc721_name,
        string calldata _erc721_symbol,
        IERC20Upgradeable _rndTokenContract,
        IERC20Upgradeable _smTokenContract,
        uint256 _periodSeconds,
        address _multisigVault,
        address _backendAddress
    ) public initializer {
        __ERC721_init(_erc721_name, _erc721_symbol);
        __ERC721Enumerable_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(BACKEND_ROLE, _backendAddress);
        _grantRole(SM_ROLE, msg.sender);
        _grantRole(INVESTOR_ROLE, _backendAddress);

        RND_TOKEN = _rndTokenContract;
        SM_TOKEN = _smTokenContract;
        PERIOD_SECONDS = _periodSeconds;
        MultiSigRND = _multisigVault;
    }

    // [] implement setAllowanceForSM
    // [] create interface contract for VCERC721.sol
    // [] create new access roles and add roles to functions - lets create a document/slide for all the contracts and roles
    // [] check if SM_TOKEN is needed, remove if not
    // [] add claimable amount to getInvestmentInfo()
    // [] why do I need to add allowance for VC on VC's tokens to transfer when claiming tokens???

    // [x] need to implement a function when the VC can transfer RND to itself when minting new investment token
    // [x] limit ERC721 token info checks to only owners to keep privacy of investors? should we? - Lets create a new role e.g.: INVESTOR_INFO and grantRole to recipient and Backend
    // [x] should we keep _calculateTotalClaimableTokens? (checks all tokens of an address) - NO
    // [x] remove hardhar console import
    // [x] should we store the block.timestamp when the investment was minted? - YES
    // [x] should we allow burning investment token? - dont allow
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
            uint256 rndClaimedAmount,
            uint256 vestingPeriod,
            uint256 vestingStartTime
        )
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        rndTokenAmount = vestingToken[tokenId].rndTokenAmount;
        rndClaimedAmount = vestingToken[tokenId].rndClaimedAmount;
        vestingPeriod = vestingToken[tokenId].vestingPeriod;
        vestingStartTime = vestingToken[tokenId].vestingStartTime;
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
    ) public onlyRole(INVESTOR_ROLE) {
        uint256 claimable = _calculateClaimableTokens(tokenId);
        require(claimable >= amount, "VC: amount is more than claimable");

        _addClaimedTokens(amount, tokenId);

        IERC20Upgradeable(RND_TOKEN).safeIncreaseAllowance(
            address(this),
            amount
        );

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
        vestingToken[tokenId].rndClaimedAmount += amount;
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
            claimableAmount =
                (vestedPeriods * investment.rndTokenAmount) /
                investment.vestingPeriod -
                investment.rndClaimedAmount -
                investment.rndStakedAmount;
        } else {
            // If all periods are vested already
            claimableAmount =
                investment.rndTokenAmount -
                investment.rndClaimedAmount -
                investment.rndStakedAmount;
        }
    }

    // Mints a token and associates an investment to it and sets tokenURI
    function mintNewInvestment(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod
    ) public onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        // Fetching RND from Multisig
        require(
            _getRND(rndTokenAmount),
            "VC: Cannot request required RND from Multisig"
        );
        // Incrementing token counter and minting new token to recipient
        tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(recipient, tokenId);

        // Initializing investment struct and assigning to the newly minted token
        if (vestingStartTime == 0) {
            vestingStartTime = block.timestamp;
        }
        vestingStartTime += cliffPeriod;
        vestingPeriod = vestingPeriod * PERIOD_SECONDS * 1 seconds;
        uint256 mintTimestamp = block.timestamp;
        uint256 rndClaimedAmount = 0;
        uint256 rndStakedAmount = 0;
        bool exists = true;
        VestingInvestment memory investment = VestingInvestment(
            rndTokenAmount,
            rndClaimedAmount,
            rndStakedAmount,
            vestingPeriod,
            vestingStartTime,
            mintTimestamp,
            exists
        );
        vestingToken[tokenId] = investment;
        _grantRole(INVESTOR_ROLE, recipient);
        emit NewInvestmentTokenMinted(
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
            mintTimestamp,
            tokenId
        );
    }

    // Function which allows VC to pull RND funds when minting an investment
    function _getRND(uint256 amount) internal returns (bool) {
        IERC20Upgradeable(RND_TOKEN).safeTransferFrom(
            MultiSigRND,
            address(this),
            amount
        );
        emit FetchedRND(amount);
        return true;
    }

    function updateMultiSigRNDAddress(address newAddress)
        public
        onlyRole(BACKEND_ROLE)
    {
        MultiSigRND = newAddress;
        emit MultiSigAddressUpdated(newAddress);
    }

    function updateRNDAddress(IERC20Upgradeable newAddress)
        public
        onlyRole(BACKEND_ROLE)
    {
        RND_TOKEN = newAddress;
        emit RNDAddressUpdated(newAddress);
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

    function burn(uint256 tokenId)
        public
        virtual
        override
        onlyRole(BURNER_ROLE)
    {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721Burnable: caller is not owner nor approved"
        );
        _burn(tokenId);
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