// [] add claimable amount to getInvestmentInfo()
// [] create interface contract for VCERC721.sol
// [x] implement setAllowanceForSM
// [x] create new access roles and add roles to functions - lets create a document/slide for all the contracts and roles
// [x] check if SM_TOKEN is needed, remove if not
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/// @title Rand.network ERC721 Vesting Controller contract
/// @author @adradr - Adrian Lenard
/// @notice Manages the vesting schedules for Rand investors
/// @dev Interacts with Rand token and Safety Module (SM)
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

    /// @notice Initializer allow proxy scheme
    /// @dev for upgradability its necessary to use initialize instead of simple constructor
    /// @param _erc721_name Name of the token like `Rand Vesting Controller ERC721`
    /// @param _erc721_symbol Short symbol like `vRND`
    /// @param _rndTokenContract Address of the Rand Token ERC20 token contract, can be modified later
    /// @param _smTokenContract Address of the Safety Module ERC20 token contract, can be modified later
    /// @param _periodSeconds Amount of seconds to set 1 period to like 60*60*24 for 1 day
    /// @param _multisigVault Address of the Rand Token Multisig contract
    /// @param _backendAddress Address of the backend like OZ Defender
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

        RND_TOKEN = _rndTokenContract;
        SM_TOKEN = _smTokenContract;
        PERIOD_SECONDS = _periodSeconds;
        MultiSigRND = _multisigVault;

        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _multisigVault);
        _grantRole(BURNER_ROLE, _multisigVault);
        _grantRole(BACKEND_ROLE, _backendAddress);
        _grantRole(INVESTOR_ROLE, _backendAddress);
        _grantRole(SM_ROLE, address(SM_TOKEN));
    }

    /// @notice View function to get amount of claimable tokens from vested investment token
    /// @dev only accessible by the INVESTOR_ROLE, which is granted to the investors wallet and the backend address
    /// @param tokenId the tokenId for which to query the claimable amount
    /// @return amounts of tokens an investor is eligible to claim (already vested and unclaimed amount)
    function getClaimableTokens(uint256 tokenId)
        public
        view
        onlyRole(INVESTOR_ROLE)
        returns (uint256)
    {
        return _calculateClaimableTokens(tokenId);
    }

    /// @notice View function to get information about a vested investment token
    /// @dev only accessible by the INVESTOR_ROLE, which is granted to the investors wallet and the backend address
    /// @param tokenId is the id of the token for which to get info
    /// @return rndTokenAmount is the amount of the total investment
    /// @return rndClaimedAmount amounts of tokens an investor already claimed and received
    /// @return vestingPeriod number of periods the investment is vested for
    /// @return vestingStartTime the timestamp when the vesting starts to kick-in
    function getInvestmentInfo(uint256 tokenId)
        public
        view
        onlyRole(INVESTOR_ROLE)
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

    /// @notice Function for Safety Module to increase the staked RND amount
    /// @dev emits StakedAmountModifier() and only accessible by the Safety Module contract via SM_ROLE
    /// @param tokenId the tokenId for which to increase staked amount
    /// @param amount the amount of tokens to increase staked amount
    function modifyStakedAmount(uint256 tokenId, uint256 amount)
        external
        onlyRole(SM_ROLE)
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        vestingToken[tokenId].rndStakedAmount = amount;
        emit StakedAmountModified(tokenId, amount);
    }

    /// @notice Function to allow SM to transfer funds when vesting investor stakes
    /// @dev only accessible by the Safety Module contract via SM_ROLE
    /// @param amount the amount of tokens to increase allowance for SM as spender on tokens of VC
    function setAllowanceForSM(uint256 amount) external onlyRole(SM_ROLE) {
        IERC20Upgradeable(RND_TOKEN).safeIncreaseAllowance(
            address(SM_TOKEN),
            amount
        );
    }

    /// @notice Claim function to withdraw vested tokens
    /// @dev emits ClaimedAmount() and only accessible by the INVESTOR_ROLE, which is granted to the investors wallet and the backend address
    /// @param tokenId is the id of investment to submit the claim on
    /// @param recipient is the address where to withdraw claimed funds to
    /// @param amount is the amount of vested tokens to claim in the process
    function claimTokens(
        uint256 tokenId,
        address recipient,
        uint256 amount
    ) public onlyRole(INVESTOR_ROLE) {
        uint256 claimable = _calculateClaimableTokens(tokenId);
        require(claimable >= amount, "VC: amount is more than claimable");
        _addClaimedTokens(amount, tokenId);
        IERC20Upgradeable(RND_TOKEN).safeTransfer(recipient, amount);
        emit ClaimedAmount(tokenId, recipient, amount);
    }

    /// @notice Adds claimed amount to the investments
    /// @dev internal function only called by the claimTokens() function
    /// @param amount is the amount of vested tokens to claim in the process
    /// @param tokenId is the id of investment to submit the claim on
    function _addClaimedTokens(uint256 amount, uint256 tokenId) internal {
        VestingInvestment memory investment = vestingToken[tokenId];
        require(
            investment.rndTokenAmount - investment.rndClaimedAmount >= amount,
            "VC: Amount to be claimed is more than remaining"
        );
        vestingToken[tokenId].rndClaimedAmount += amount;
    }

    /// @notice Calculates the claimable amount as of now for a tokenId
    /// @dev internal function only called by the claimTokens() function
    /// @param tokenId is the id of investment to submit the claim on
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

    /// @notice Mints a token and associates an investment to it and sets tokenURI
    /// @dev emits NewInvestmentTokenMinted() and only accessible with MINTER_ROLE
    /// @param recipient is the address to whom the investment token should be minted to
    /// @param rndTokenAmount is the amount of the total investment
    /// @param vestingPeriod number of periods the investment is vested for
    /// @param vestingStartTime the timestamp when the vesting starts to kick-in
    /// @param cliffPeriod is the number of periods the vestingStartTime is shifted by
    /// @return tokenId the id of the minted token
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

    /// @notice Function which allows VC to pull RND funds when minting an investment
    /// @dev emit FetchedRND()
    /// @param amount of tokens to fetch from the Rand Multisig when minting a new investment
    /// @return bool
    function _getRND(uint256 amount) internal returns (bool) {
        IERC20Upgradeable(RND_TOKEN).safeTransferFrom(
            MultiSigRND,
            address(this),
            amount
        );
        emit FetchedRND(amount);
        return true;
    }

    /// @notice Function to let Rand to update the address of the Multisig
    /// @dev emits MultiSigAddressUpdated() and only accessible by BACKEND_ROLE
    /// @param newAddress where the new Multisig is located
    function updateMultiSigRNDAddress(address newAddress)
        public
        onlyRole(BACKEND_ROLE)
    {
        MultiSigRND = newAddress;
        emit MultiSigAddressUpdated(newAddress);
    }

    /// @notice Function to let Rand to update the address of the Rand Token
    /// @dev emits RNDAddressUpdated() and only accessible by BACKEND_ROLE
    /// @param newAddress where the new Rand Token is located
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
