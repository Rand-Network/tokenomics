// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IAddressRegistry.sol";
import "../interfaces/IInvestorsNFT.sol";

/// @title Rand.network ERC721 Vesting Controller contract
/// @author @adradr - Adrian Lenard
/// @notice Manages the vesting schedules for Rand investors
/// @dev Interacts with Rand token and Safety Module (SM)

contract VestingControllerERC721 is
    Initializable,
    UUPSUpgradeable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // Events
    event BaseURIChanged(string baseURI);
    event ContractURIChanged(string contractURI);
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
    event InvestmentTransferred(address recipient, uint256 amount);
    event RNDTransferred(address recipient, uint256 amount);
    event FetchedRND(uint256 amount);
    event RegistryAddressUpdated(IAddressRegistry newAddress);

    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using StringsUpgradeable for uint256;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    CountersUpgradeable.Counter internal _tokenIdCounter;

    uint256 public PERIOD_SECONDS;
    // Mapping to store VC tokenIds to NFT tokenIds
    mapping(uint256 => uint256) internal nftTokenToVCToken;
    string public baseURI;
    IAddressRegistry REGISTRY;

    struct VestingInvestment {
        uint256 rndTokenAmount;
        uint256 rndClaimedAmount;
        uint256 rndStakedAmount;
        uint256 vestingPeriod;
        uint256 vestingStartTime;
        uint256 mintTimestamp;
        bool exists;
    }
    mapping(uint256 => VestingInvestment) internal vestingToken;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev for upgradability its necessary to use initialize instead of simple constructor
    /// @param _erc721_name Name of the token like `Rand Vesting Controller ERC721`
    /// @param _erc721_symbol Short symbol like `vRND`
    /// @param _periodSeconds Amount of seconds to set 1 period to like 60*60*24 for 1 day
    /// @param _registry is the address of address registry
    function initialize(
        string calldata _erc721_name,
        string calldata _erc721_symbol,
        uint256 _periodSeconds,
        IAddressRegistry _registry
    ) public initializer {
        __ERC721_init(_erc721_name, _erc721_symbol);
        __ERC721Enumerable_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();

        PERIOD_SECONDS = _periodSeconds;
        REGISTRY = _registry;

        address _multisigVault = REGISTRY.getAddress("MS");
        address _backendAddress = REGISTRY.getAddress("OZ");
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _multisigVault);
        _grantRole(BURNER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _backendAddress);
    }

    modifier onlyInvestorOrRand(uint256 tokenId) {
        bool isTokenOwner = ownerOf(tokenId) == _msgSender();
        bool isBackend = REGISTRY.getAddress("OZ") == _msgSender();
        bool isSM = REGISTRY.getAddress("SM") == _msgSender();
        bool isGov = REGISTRY.getAddress("GOV") == _msgSender();
        require(
            isTokenOwner || isBackend || isSM || isGov,
            "VC: No access role for this address"
        );
        _;
    }

    modifier onlySM() {
        require(
            REGISTRY.getAddress("SM") == _msgSender(),
            "VC: Not accessible by msg.sender"
        );
        _;
    }

    /// @notice View function to get amount of claimable tokens from vested investment token
    /// @dev only accessible by the investor's wallet, the backend address and safety module contract
    /// @param tokenId the tokenId for which to query the claimable amount
    /// @return amounts of tokens an investor is eligible to claim (already vested and unclaimed amount)
    function getClaimableTokens(uint256 tokenId)
        public
        view
        onlyInvestorOrRand(tokenId)
        returns (uint256)
    {
        return _calculateClaimableTokens(tokenId);
    }

    /// @notice View function to get information about a vested investment token
    /// @dev only accessible by the investor's wallet, the backend address and safety module contract
    /// @param tokenId is the id of the token for which to get info
    /// @return rndTokenAmount is the amount of the total investment
    /// @return rndClaimedAmount amounts of tokens an investor already claimed and received
    /// @return vestingPeriod number of periods the investment is vested for
    /// @return vestingStartTime the timestamp when the vesting starts to kick-in
    function getInvestmentInfo(uint256 tokenId)
        public
        view
        onlyInvestorOrRand(tokenId)
        returns (
            uint256 rndTokenAmount,
            uint256 rndClaimedAmount,
            uint256 vestingPeriod,
            uint256 vestingStartTime,
            uint256 rndStakedAmount
        )
    {
        // nftTokenToVCToken[tokenId] != 0
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");

        rndTokenAmount = vestingToken[tokenId].rndTokenAmount;
        rndClaimedAmount = vestingToken[tokenId].rndClaimedAmount;
        vestingPeriod = vestingToken[tokenId].vestingPeriod;
        vestingStartTime = vestingToken[tokenId].vestingStartTime;
        rndStakedAmount = vestingToken[tokenId].rndStakedAmount;
    }

    /// @notice View function to get information about a vested investment token exclusively for the Investors NFT contract
    /// @dev only accessible by the investors NFT contract
    /// @param nftTokenId is the id of the token for which to get info
    /// @return rndTokenAmount is the amount of the total investment
    /// @return rndClaimedAmount amounts of tokens an investor already claimed and received
    function getInvestmentInfoForNFT(uint256 nftTokenId)
        external
        view
        returns (uint256 rndTokenAmount, uint256 rndClaimedAmount)
    {
        require(
            REGISTRY.getAddress("NFT") == _msgSender(),
            "VC: Only Investors NFT allowed to call"
        );
        require(
            nftTokenToVCToken[nftTokenId] != 0,
            "VC: nftTokenId does not exist"
        );
        uint256 tokenId = nftTokenToVCToken[nftTokenId];
        rndTokenAmount = vestingToken[tokenId].rndTokenAmount;
        rndClaimedAmount = vestingToken[tokenId].rndClaimedAmount;
    }

    /// @notice Claim function to withdraw vested tokens
    /// @dev emits ClaimedAmount() and only accessible by the investor's wallet, the backend address and safety module contract
    /// @param tokenId is the id of investment to submit the claim on
    /// @param amount is the amount of vested tokens to claim in the process
    function claimTokens(uint256 tokenId, uint256 amount)
        public
        whenNotPaused
        onlyInvestorOrRand(tokenId)
        whenNotPaused
        nonReentrant
    {
        address recipient = ownerOf(tokenId);
        uint256 claimable = _calculateClaimableTokens(tokenId);
        require(claimable >= amount, "VC: amount is more than claimable");
        _addClaimedTokens(amount, tokenId);
        IERC20Upgradeable(REGISTRY.getAddress("RND")).safeTransfer(
            recipient,
            amount
        );
        emit ClaimedAmount(tokenId, recipient, amount);
    }

    /// @notice Adds claimed amount to the investments
    /// @dev internal function only called by the claimTokens() function
    /// @param amount is the amount of vested tokens to claim in the process
    /// @param tokenId is the id of investment to submit the claim on
    function _addClaimedTokens(uint256 amount, uint256 tokenId) internal {
        VestingInvestment storage investment = vestingToken[tokenId];
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
        require(block.timestamp > investment.vestingStartTime);
        uint256 vestedPeriods;
        unchecked {
            vestedPeriods = block.timestamp - investment.vestingStartTime;
        }

        // If there is still not yet vested periods
        if (vestedPeriods < investment.vestingPeriod) {
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
    /// @return tokenId the id of the minted token on VC
    function mintNewInvestment(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod
    )
        public
        whenNotPaused
        nonReentrant
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        // Minting vesting investment inside VC
        tokenId = _mintNewInvestment(
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod
        );
    }

    /// @notice Mints a token and associates an investment to it and sets tokenURI and also mints an investors NFT
    /// @dev emits NewInvestmentTokenMinted() and only accessible with MINTER_ROLE
    /// @param recipient is the address to whom the investment token should be minted to
    /// @param rndTokenAmount is the amount of the total investment
    /// @param vestingPeriod number of periods the investment is vested for
    /// @param vestingStartTime the timestamp when the vesting starts to kick-in
    /// @param cliffPeriod is the number of periods the vestingStartTime is shifted by
    /// @param nftTokenId is the tokenId to be used on the investors NFT when minting
    /// @return tokenId the id of the minted token on VC

    function mintNewInvestment(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod,
        uint256 nftTokenId
    )
        public
        whenNotPaused
        nonReentrant
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        // Minting vesting investment inside VC
        tokenId = _mintNewInvestment(
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod
        );
        // Minting NFT investment for early investors
        IInvestorsNFT(REGISTRY.getAddress("NFT")).mintInvestmentNFT(
            recipient,
            nftTokenId
        );
        // Storing the VC tokenId to the corresponding NFT tokenId
        nftTokenToVCToken[nftTokenId] = tokenId;
    }

    function _mintNewInvestment(
        address recipient,
        uint256 rndTokenAmount,
        uint256 vestingPeriod,
        uint256 vestingStartTime,
        uint256 cliffPeriod
    ) internal returns (uint256 tokenId) {
        // Fetching RND from Multisig
        _getRND(rndTokenAmount);
        // Incrementing token counter and minting new token to recipient
        tokenId = _safeMint(recipient);

        // Initializing investment struct and assigning to the newly minted token
        if (vestingStartTime == 0) {
            vestingStartTime = block.timestamp;
        }
        vestingStartTime += cliffPeriod;
        vestingPeriod = vestingPeriod * PERIOD_SECONDS;
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

    /// @notice Transfers RND Tokens to non-vesting investor, its used to distribute public sale tokens by backend
    /// @dev emits InvestmentTransferred() and only accessible with MINTER_ROLE
    /// @param recipient is the address to whom the token should be transferred to
    /// @param rndTokenAmount is the amount of the total investment
    function distributeTokens(address recipient, uint256 rndTokenAmount)
        public
        whenNotPaused
        nonReentrant
        onlyRole(MINTER_ROLE)
    {
        require(rndTokenAmount > 0, "VC: Amount must be more than zero");
        IERC20Upgradeable(REGISTRY.getAddress("RND")).safeTransferFrom(
            REGISTRY.getAddress("MS"),
            recipient,
            rndTokenAmount
        );
        emit InvestmentTransferred(recipient, rndTokenAmount);
    }

    /// @notice Function for Safety Module to increase the staked RND amount
    /// @dev emits StakedAmountModifier() and only accessible by the Safety Module contract via SM_ROLE
    /// @param tokenId the tokenId for which to increase staked amount
    /// @param amount the amount of tokens to increase staked amount
    function modifyStakedAmount(uint256 tokenId, uint256 amount)
        external
        whenNotPaused
        onlySM
    {
        require(vestingToken[tokenId].exists, "VC: tokenId does not exist");
        vestingToken[tokenId].rndStakedAmount = amount;
        emit StakedAmountModified(tokenId, amount);
    }

    /// @notice Function which allows VC to pull RND funds when minting an investment
    /// @dev emit FetchedRND(), needs allowance from MultiSig on initial RND supply
    /// @param amount of tokens to fetch from the Rand Multisig when minting a new investment
    function _getRND(uint256 amount) internal {
        IERC20Upgradeable(REGISTRY.getAddress(RAND_TOKEN)).safeTransferFrom(
            REGISTRY.getAddress(MULTISIG),
            address(this),
            amount
        );
        emit FetchedRND(amount);
    }

    /// @notice Function to let Rand to update the address of the Safety Module
    /// @dev emits RegistryAddressUpdated() and only accessible by MultiSig
    /// @param newAddress where the new Safety Module contract is located
    function updateRegistryAddress(IAddressRegistry newAddress)
        public
        whenPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        REGISTRY = newAddress;
        emit RegistryAddressUpdated(newAddress);
    }

    /// @notice Simple utility function to get investent tokenId based on an NFT tokenId
    /// @param tokenIdNFT tokenId of the early investor NFT
    /// @return tokenId of the investment
    function getTokenIdOfNFT(uint256 tokenIdNFT)
        public
        view
        returns (uint256 tokenId)
    {
        tokenId = nftTokenToVCToken[tokenIdNFT];
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _safeMint(address to)
        internal
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
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

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable) {
        bool isClaimedAll;
        if (vestingToken[tokenId].exists) {
            uint256 rndTokenAmount = vestingToken[tokenId].rndTokenAmount;
            uint256 rndClaimedAmount = vestingToken[tokenId].rndClaimedAmount;
            isClaimedAll = rndTokenAmount == rndClaimedAmount;
        }
        require(
            isClaimedAll,
            "VC: Transfer of token is prohibited until investment is totally claimed"
        );
        super._transfer(from, to, tokenId);
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

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
