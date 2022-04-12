// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title Rand.network Address Registry for Rand Ecosystem
/// @author @adradr - Adrian Lenard
/// @notice Stores addresses for ecosystem contracts
/// @dev Functionality integrated into all ecosystem contracts
contract AddressRegistry is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event NewAddressSet(string indexed name);
    event AddressChanged(string indexed name, address contractAddress);

    mapping(string => address[]) internal addressStorage;
    string[] internal addressId;
    uint256 internal addressIdLenght;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multisigVault) public initializer {
        require(_multisigVault != address(0));
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
    }

    /// @notice Returns all the stored contract names in strings
    /// @return an array of strings
    function getRegistryList() public view returns (string[] memory) {
        return addressId;
    }

    /// @notice Returns the current address for a contract located in the ecosystem
    /// @param name is the string name of the contract
    /// @return contractAddress is the address of the input name contract
    function getAddress(string calldata name)
        public
        view
        returns (address contractAddress)
    {
        address[] storage tempAddresses = addressStorage[name];
        return tempAddresses[tempAddresses.length - 1];
    }

    /// @notice Useful to query all the addresses used for a contract
    /// @param name is the string name of the contract
    /// @return an array of addresses of the contract
    function getAllAddress(string calldata name)
        public
        view
        returns (address[] memory)
    {
        return addressStorage[name];
    }

    /// @notice Used to update the latest address for a contract
    /// @param name is the string name of the contract
    /// @param contractAddress is the new address to set for a contract
    function updateAddress(string calldata name, address contractAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        bytes memory tempStringByte = bytes(name);
        address[] storage tempAddresses = addressStorage[name];
        require(tempStringByte.length > 0, "Registry: No contract name set");
        require(contractAddress != address(0), "Registry: No address set");
        require(_existInArray(name), "Registry: Contract name does not exists");
        require(
            tempAddresses[tempAddresses.length - 1] != contractAddress,
            "Registry: New address is the same as the current"
        );

        tempAddresses.push(contractAddress);
        emit AddressChanged(name, contractAddress);
    }

    /// @notice Used to register a new address in the registry
    /// @param name is the string name of the contract
    /// @param contractAddress is the new address to set for a contract
    /// @return true if successful, false if already exists
    function setNewAddress(string calldata name, address contractAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bool)
    {
        bytes memory tempStringByte = bytes(name);
        require(tempStringByte.length > 0, "Registry: No name set");
        require(contractAddress != address(0), "Registry: No address set");
        //require(!_existInArray(name), "Registry: Contract name already exists");
        if (_existInArray(name)) {
            return false;
        }

        addressIdLenght += 1;
        addressId.push(name);
        addressStorage[name].push(contractAddress);
        emit NewAddressSet(name);
        emit AddressChanged(name, contractAddress);
        return true;
    }

    function _existInArray(string calldata name) internal view returns (bool) {
        for (uint256 i = 0; i < addressIdLenght; i++) {
            if (
                keccak256(abi.encodePacked(addressId[i])) ==
                keccak256(abi.encodePacked(name))
            ) {
                return true;
            }
        }
        return false;
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
