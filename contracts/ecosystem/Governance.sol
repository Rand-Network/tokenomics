// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

//import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IAddressRegistry.sol";
import "../interfaces/IVestingControllerERC721.sol";

/// @title Rand.network ERC20 Governance Aggregator contract for Automata Witness
/// @author @adradr - Adrian Lenard
/// @notice Default implementation of the OpenZeppelin ERC20 standard by overriding balanceOf() and totalSupply() and disallow token transfers
contract Governance is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    event RegistryAddressUpdated(IAddressRegistry newAddress);

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant READER_ROLE = keccak256("READER_ROLE");

    string private name_;
    string private symbol_;

    IAddressRegistry public REGISTRY;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param _name Name of the token like `Rand Governance Aggregator ERC20`
    /// @param _symbol Short symbol like `gRND`
    /// @param _registry is the address of address registry
    function initialize(
        string memory _name,
        string memory _symbol,
        IAddressRegistry _registry
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();

        name_ = _name;
        symbol_ = _symbol;
        REGISTRY = _registry;

        address _multisigVault = REGISTRY.getAddress("MS");
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(READER_ROLE, _multisigVault);
    }

    /// @notice Function to let Rand to update the address of the Safety Module
    /// @dev emits RegistryAddressUpdated() and only accessible by MultiSig
    /// @param newAddress where the new Safety Module contract is located
    function updateRegistryAddress(IAddressRegistry newAddress)
        public
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        REGISTRY = newAddress;
        emit RegistryAddressUpdated(newAddress);
    }

    /// @notice Function to override default totalSupply and point it to the totalSupply of RND token contract
    function totalSupply() public view returns (uint256) {
        return IERC20Upgradeable(REGISTRY.getAddress("RND")).totalSupply();
    }

    /// @notice Function to summarize balances of an account over multiple Rand Ecosystem tokens
    /// @param account to summarize balance for in VC, SM and RND
    function balanceOf(address account)
        public
        view
        onlyRole(READER_ROLE)
        returns (uint256)
    {
        // VC balanceOf = rndTokenAmount - rndClaimedAmount - rndStakedAmount
        // tokenOfOwnerByIndex(address owner, uint256 index) → uint256
        // Returns a token ID owned by owner at a given index of its token list.
        // Use along with balanceOf to enumerate all of owner's tokens.
        uint256 _accountBalance;
        address _vcAddress = REGISTRY.getAddress("VC");
        uint256 _vcBalance = IVestingControllerERC721(_vcAddress).balanceOf(
            account
        );
        for (uint256 i; i < _vcBalance; i++) {
            // Get tokenId
            uint256 _tokenId = IVestingControllerERC721(_vcAddress)
                .tokenOfOwnerByIndex(account, i);
            // Get Investment info for tokenId
            (
                uint256 rndTokenAmount,
                uint256 rndClaimedAmount,
                ,
                ,
                uint256 rndStakedAmount
            ) = IVestingControllerERC721(_vcAddress).getInvestmentInfo(
                    _tokenId
                );
            _accountBalance +=
                rndTokenAmount -
                rndClaimedAmount -
                rndStakedAmount;
        }
        // SM balanceOf = SM.balanceOf()
        _accountBalance += IERC20Upgradeable(REGISTRY.getAddress("SM"))
            .balanceOf(account);
        // RND balanceOf = RND.balanceOf()
        _accountBalance += IERC20Upgradeable(REGISTRY.getAddress("RND"))
            .balanceOf(account);

        return _accountBalance;
    }

    function name() public view returns (string memory) {
        return name_;
    }

    function symbol() public view returns (string memory) {
        return symbol_;
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
