// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRandToken {
    function BPT_TOKEN() external view returns (string memory);

    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function ECOSYSTEM_RESERVE() external view returns (string memory);

    function GOVERNANCE() external view returns (string memory);

    function INVESTOR_NFT() external view returns (string memory);

    function MINTER_ROLE() external view returns (bytes32);

    function MULTISIG() external view returns (string memory);

    function OPENZEPPELIN_DEFENDER() external view returns (string memory);

    function PAUSER_ROLE() external view returns (bytes32);

    function RAND_TOKEN() external view returns (string memory);

    function READER_ROLE() external view returns (bytes32);

    function REGISTRY() external view returns (address);

    function SAFETY_MODULE() external view returns (string memory);

    function VESTING_CONTROLLER() external view returns (string memory);

    function SafetyModuleTransfer(
        address owner,
        address recipient,
        uint256 amount
    ) external;

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function burn(uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;

    function burnFromAdmin(address account, uint256 amount) external;

    function decimals() external view returns (uint8);

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) external returns (bool);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) external returns (bool);

    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 _initialSupply,
        address _registry
    ) external;

    function mint(address to, uint256 amount) external;

    function name() external view returns (string memory);

    function pause() external;

    function paused() external view returns (bool);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function unpause() external;

    function updateRegistryAddress(address newAddress) external;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;
}
