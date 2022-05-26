// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./AddressConstants.sol";

/// @title Rand.network ERC20 Token contract
/// @author @adradr - Adrian Lenard
/// @notice Default implementation of the OpenZeppelin ERC20 standard to be used for the RND token
contract RandToken is
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    AddressConstants
{
    event RegistryAddressUpdated(IAddressRegistry newAddress);

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param name_ Name of the token like `Rand Token ERC20`
    /// @param symbol_ Short symbol like `RND`
    /// @param _initialSupply Total supply to mint initially like `200e6`
    /// @param _registry is the address of address registry
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 _initialSupply,
        IAddressRegistry _registry
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        REGISTRY = _registry;

        address _multisigVault = REGISTRY.getAddress(MULTISIG);
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _multisigVault);
        _mint(_multisigVault, _initialSupply * 10**decimals());
    }

    /// @notice Function to allow admins to move funds without multiple approve and transfer steps
    /// @dev Aims to allow simple UX
    /// @param owner is the address who's tokens are approved and transferred
    /// @param recipient is the address where to transfer the funds
    /// @param amount is the amount of transfer
    function adminTransfer(
        address owner,
        address recipient,
        uint256 amount
    ) external whenNotPaused {
        require(
            REGISTRY.getAddress(SAFETY_MODULE) == _msgSender(),
            "RND: Not accessible by msg.sender"
        );
        _transfer(owner, recipient, amount);
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

    function mint(address to, uint256 amount)
        public
        whenNotPaused
        onlyRole(MINTER_ROLE)
    {
        _mint(to, amount);
    }

    function burn(address account, uint256 amount)
        public
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _burn(account, amount);
    }

    /// @inheritdoc	ERC20Upgradeable
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
