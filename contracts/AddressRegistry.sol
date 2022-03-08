// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AddressRegistry is
    Initializable,
    UUPSUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant READER_ROLE = keccak256("READER_ROLE");

    event NewAddressSet(string indexed name);
    event AddressChanged(string indexed name, address contractAddress);

    mapping(string => address[]) internal addressStorage;
    string[] internal addressId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multisigVault) public initializer {
        __Pausable_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(READER_ROLE, _multisigVault);
        _grantRole(UPDATER_ROLE, _multisigVault);
    }

    function getRegistryList()
        public
        view
        onlyRole(READER_ROLE)
        returns (string[] memory)
    {
        return addressId;
    }

    function getAddress(string calldata name)
        public
        view
        onlyRole(READER_ROLE)
        returns (address contractAddress)
    {
        address[] memory tempArray = addressStorage[name];
        return tempArray[tempArray.length - 1];
    }

    function getAllAddress(string calldata name)
        public
        view
        onlyRole(READER_ROLE)
        returns (address[] memory)
    {
        return addressStorage[name];
    }

    function updateAddress(string calldata name, address contractAddress)
        public
        onlyRole(UPDATER_ROLE)
    {
        bytes memory tempStringByte = bytes(name);
        require(tempStringByte.length > 0, "Registry: No contract name set");
        require(contractAddress != address(0), "Registry: No address set");
        require(_existInArray(name), "Registry: Contract name does not exists");
        require(
            addressStorage[name][addressStorage[name].length - 1] !=
                contractAddress,
            "Registry: New address is the same as the current"
        );

        addressStorage[name].push(contractAddress);
        emit AddressChanged(name, contractAddress);
    }

    function setNewAddress(string calldata name, address contractAddress)
        public
        onlyRole(UPDATER_ROLE)
    {
        bytes memory tempStringByte = bytes(name);
        require(tempStringByte.length > 0, "Registry: No name set");
        require(contractAddress != address(0), "Registry: No address set");
        require(!_existInArray(name), "Registry: Contract name already exists");

        addressId.push(name);
        addressStorage[name].push(contractAddress);
        emit NewAddressSet(name);
        emit AddressChanged(name, contractAddress);
    }

    function _existInArray(string calldata name) internal view returns (bool) {
        for (uint256 i; i < addressId.length; i++) {
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
