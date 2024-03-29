// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IStakedRand {
    function BPT_TOKEN() external view returns (string memory);

    function COOLDOWN_SECONDS() external view returns (uint256);

    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function ECOSYSTEM_RESERVE() external view returns (string memory);

    function GOVERNANCE() external view returns (string memory);

    function INVESTOR_NFT() external view returns (string memory);

    function MINTER_ROLE() external view returns (bytes32);

    function MULTISIG() external view returns (string memory);

    function OPENZEPPELIN_DEFENDER() external view returns (string memory);

    function PAUSER_ROLE() external view returns (bytes32);

    function PRECISION() external view returns (uint256);

    function RAND_TOKEN() external view returns (string memory);

    function READER_ROLE() external view returns (bytes32);

    function REGISTRY() external view returns (address);

    function SAFETY_MODULE() external view returns (string memory);

    function STAKED_TOKEN() external view returns (string memory);

    function UNSTAKE_WINDOW() external view returns (uint256);

    function VESTING_CONTROLLER() external view returns (string memory);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function assets(
        address
    )
        external
        view
        returns (
            uint256 emissionRate,
            uint256 lastUpdateTimestamp,
            uint256 assetIndex
        );

    function balanceOf(address account) external view returns (uint256);

    function burn(address account, uint256 amount) external;

    function calculateTotalRewards(
        address user
    ) external view returns (uint256);

    function claimRewards(uint256 amount) external;

    function cooldown() external;

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
        string memory __name,
        string memory __symbol,
        uint256 __cooldown_seconds,
        uint256 __unstake_window,
        address __registry
    ) external;

    function name() external view returns (string memory);

    function pause() external;

    function paused() external view returns (bool);

    function proxiableUUID() external view returns (bytes32);

    function redeem(uint256 tokenId, uint256 amount) external;

    function redeem(uint256 amount) external;

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function rewardToken() external view returns (address);

    function stake(uint256 tokenId, uint256 amount) external;

    function stake(uint256 amount) external;

    function stakerCooldown(address) external view returns (uint256);

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function trackedAssets(uint256) external view returns (address);

    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function unpause() external;

    function updateAsset(
        address _asset,
        uint256 _emission,
        uint256 _totalStaked
    ) external;

    function updateCooldownPeriod(uint256 newPeriod) external;

    function updateRegistryAddress(address newAddress) external;

    function updateUnstakePeriod(uint256 newPeriod) external;

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) external;
}
