// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IAddressRegistry.sol";

/// @title Rand.network ERC20 Token contract
/// @author @adradr - Adrian Lenard
/// @notice Default implementation of the OpenZeppelin ERC20 standard to be used for the RND token
contract RandToken is
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    event RegistryAddressUpdated(IAddressRegistry newAddress);

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IAddressRegistry public REGISTRY;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param _name Name of the token like `Rand Token ERC20`
    /// @param _symbol Short symbol like `RND`
    /// @param _initialSupply Total supply to mint initially like `200e6`
    /// @param _registry is the address of address registry
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        IAddressRegistry _registry
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();

        REGISTRY = _registry;

        address _multisigVault = REGISTRY.getAddress("MS");
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _multisigVault);
        _mint(_multisigVault, _initialSupply * 10**decimals());
    }

    function approveAndTransfer(
        address owner,
        address recipient,
        uint256 amount
    ) external {
        require(
            REGISTRY.getAddress("SM") == _msgSender(),
            "RND: Not accessible by msg.sender"
        );
        uint256 currentAllowance = allowance(owner, recipient);
        _approve(owner, recipient, currentAllowance + amount);
        _transfer(owner, recipient, amount);
    }

    /// @notice Function to let Rand to update the address of the Safety Module
    /// @dev emits RegistryAddressUpdated() and only accessible by MultiSig
    /// @param newAddress where the new Safety Module contract is located
    function updateRegistryAddress(IAddressRegistry newAddress)
        public
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

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address account, uint256 amount)
        public
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
