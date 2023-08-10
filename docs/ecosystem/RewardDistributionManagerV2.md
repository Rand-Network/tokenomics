# RewardDistributionManagerV2

*@adradr - Adrian Lenard*

> Rand.network RewardDistributionManagerV2

Manages the rewards of staked tokens

*Inherited by the SafetyModuleERC20*

## Methods

### PRECISION

```solidity
function PRECISION() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### assets

```solidity
function assets(address) external view returns (uint256 emissionRate, uint256 lastUpdateTimestamp, uint256 assetIndex)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| emissionRate | uint256 | undefined |
| lastUpdateTimestamp | uint256 | undefined |
| assetIndex | uint256 | undefined |

### rewardToken

```solidity
function rewardToken() external view returns (contract IERC20Upgradeable)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20Upgradeable | undefined |

### trackedAssets

```solidity
function trackedAssets(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |



## Events

### AssetIndexUpdated

```solidity
event AssetIndexUpdated(address asset, uint256 index)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset  | address | undefined |
| index  | uint256 | undefined |

### AssetUpdated

```solidity
event AssetUpdated(address asset, uint256 newEmission)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset  | address | undefined |
| newEmission  | uint256 | undefined |

### Initialized

```solidity
event Initialized(uint8 version)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint8 | undefined |

### UserIndexUpdated

```solidity
event UserIndexUpdated(address asset, uint256 index)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset  | address | undefined |
| index  | uint256 | undefined |



