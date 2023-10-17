// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./ImportsManager.sol";

/// @title Rand.network Ecosystem Reserve
/// @author @adradr - Adrian Lenard
/// @notice Rand Ecosystem Reserve where Safety Module rewards are stored and distributed from
contract EcosystemReserve is ImportsManager {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param _registry the address of the Rand AddressRegistry
    function initialize(IAddressRegistry _registry) public initializer {
        __ImportsManager_init();

        REGISTRY = _registry;
        address _multisigVault = REGISTRY.getAddressOf(REGISTRY.MULTISIG());
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
    }

    function approve(
        IERC20Upgradeable token,
        address recipient,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        token.approve(recipient, amount);
    }

    function transfer(
        IERC20Upgradeable token,
        address recipient,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        token.safeTransfer(recipient, amount);
    }
}
