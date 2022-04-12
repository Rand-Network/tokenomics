// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IAddressRegistry.sol";
import "../interfaces/IVestingControllerERC721.sol";

/// @title Rand.network ERC721 Investors NFT contract
/// @author @adradr - Adrian Lenard
/// @notice Holds NFTs for early investors
/// @dev Interacts with Rand VestingController

contract InvestorsNFT is
    Initializable,
    UUPSUpgradeable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable
{
    // Events
    event BaseURIChanged(string baseURI);
    event ContractURIChanged(string contractURI);
    event RegistryAddressUpdated(IAddressRegistry newAddress);

    using CountersUpgradeable for CountersUpgradeable.Counter;
    using StringsUpgradeable for uint256;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    string public baseURI;
    IAddressRegistry REGISTRY;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev for upgradability its necessary to use initialize instead of simple constructor
    /// @param _erc721_name Name of the token like `Rand Vesting Controller ERC721`
    /// @param _erc721_symbol Short symbol like `vRND`
    /// @param _registry is the address of address registry

    function initialize(
        string calldata _erc721_name,
        string calldata _erc721_symbol,
        IAddressRegistry _registry
    ) public initializer {
        __ERC721_init(_erc721_name, _erc721_symbol);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        REGISTRY = _registry;

        address _multisigVault = REGISTRY.getAddress("MS");
        address _vcAddress = REGISTRY.getAddress("VC");
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _multisigVault);
        _grantRole(BURNER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _vcAddress);
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

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mintInvestmentNFT(address to, uint256 tokenId)
        external
        whenNotPaused
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        _mint(to, tokenId);
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
        whenNotPaused
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
        (
            uint256 rndTokenAmount,
            uint256 rndClaimedAmount
        ) = IVestingControllerERC721(REGISTRY.getAddress("VC"))
                .getInvestmentInfoForNFT(tokenId);

        bool isClaimedAll = rndTokenAmount == rndClaimedAmount;
        require(
            isClaimedAll,
            "NFT: Transfer of token is prohibited until investment is totally claimed"
        );
        super._transfer(from, to, tokenId);
    }

    function setBaseURI(string memory newURI)
        public
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        baseURI = newURI;
        emit BaseURIChanged(baseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable)
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        string memory baseURIString = _baseURI();

        (
            uint256 rndTokenAmount,
            uint256 rndClaimedAmount
        ) = IVestingControllerERC721(REGISTRY.getAddress("VC"))
                .getInvestmentInfoForNFT(tokenId);

        bool isClaimedAll = rndTokenAmount == rndClaimedAmount;

        return
            bytes(baseURIString).length > 0
                ? isClaimedAll
                    ? string(abi.encodePacked(baseURI, tokenId.toString(), "_"))
                    : string(abi.encodePacked(baseURI, tokenId.toString()))
                : "";
    }

    function contractURI() public view returns (string memory) {
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(_baseURI(), "contract_uri"))
                : "";
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
