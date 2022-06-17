// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IGovernance {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function PAUSER_ROLE() external view returns (bytes32);

    function READER_ROLE() external view returns (bytes32);

    function REGISTRY() external view returns (address);

    function balanceOf(address account) external view returns (uint256);

    function decimals() external pure returns (uint8);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;

    function hasRole(bytes32 role, address account)
        external
        view
        returns (bool);

    function initialize(
        string memory _name,
        string memory _symbol,
        address _registry
    ) external;

    function name() external view returns (string memory);

    function pause() external;

    function paused() external view returns (bool);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function unpause() external;

    function updateRegistryAddress(address newAddress) external;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external;
}
