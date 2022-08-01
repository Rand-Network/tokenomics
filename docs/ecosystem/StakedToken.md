# StakedToken

*@adradr - Adrian Lenard*

> Rand.network ERC20 Safety Module

Safety Module instance for the staked Rand Balance Pool Tokens



## Methods

### BPT_TOKEN

```solidity
function BPT_TOKEN() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### COOLDOWN_SECONDS

```solidity
function COOLDOWN_SECONDS() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### DEFAULT_ADMIN_ROLE

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### ECOSYSTEM_RESERVE

```solidity
function ECOSYSTEM_RESERVE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### GOVERNANCE

```solidity
function GOVERNANCE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### INVESTOR_NFT

```solidity
function INVESTOR_NFT() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### MINTER_ROLE

```solidity
function MINTER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### MULTISIG

```solidity
function MULTISIG() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### OPENZEPPELIN_DEFENDER

```solidity
function OPENZEPPELIN_DEFENDER() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### PAUSER_ROLE

```solidity
function PAUSER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### PRECISION

```solidity
function PRECISION() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### RAND_TOKEN

```solidity
function RAND_TOKEN() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### READER_ROLE

```solidity
function READER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### REGISTRY

```solidity
function REGISTRY() external view returns (contract IAddressRegistry)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IAddressRegistry | undefined |

### SAFETY_MODULE

```solidity
function SAFETY_MODULE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### STAKED_TOKEN

```solidity
function STAKED_TOKEN() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### UNSTAKE_WINDOW

```solidity
function UNSTAKE_WINDOW() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### VESTING_CONTROLLER

```solidity
function VESTING_CONTROLLER() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```



*See {IERC20-allowance}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| spender | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### approve

```solidity
function approve(address spender, uint256 amount) external nonpayable returns (bool)
```



*See {IERC20-approve}. Requirements: - `spender` cannot be the zero address.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

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

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```



*See {IERC20-balanceOf}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### burn

```solidity
function burn(address account, uint256 amount) external nonpayable
```

Burn staked tokens (avaiable only for DEFAULT_ADMIN_ROLE)

*Returns collateral tokens to the caller*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | is the address of the user to burn tokens from |
| amount | uint256 | is the uint256 amount to burn |

### calculateTotalRewards

```solidity
function calculateTotalRewards(address user) external view returns (uint256)
```

Calculates the total rewards for a user

*Uses RewardDistributionManager `_getUnclaimedRewards`*

#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | address of the user |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | total claimable rewards for the user |

### claimRewards

```solidity
function claimRewards(uint256 amount) external nonpayable
```

Claims the rewards for a user

*Uses `_updateUnclaimedRewards`, transfers rewards*

#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | amount of reward to claim |

### cooldown

```solidity
function cooldown() external nonpayable
```

Triggers cooldown period for the caller

*Check the actial COOLDOWN_PERIOD for lenght in seconds*


### decimals

```solidity
function decimals() external view returns (uint8)
```



*Returns the number of decimals used to get its user representation. For example, if `decimals` equals `2`, a balance of `505` tokens should be displayed to a user as `5.05` (`505 / 10 ** 2`). Tokens usually opt for a value of 18, imitating the relationship between Ether and Wei. This is the value {ERC20} uses, unless this function is overridden; NOTE: This information is only used for _display_ purposes: it in no way affects any of the arithmetic of the contract, including {IERC20-balanceOf} and {IERC20-transfer}.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined |

### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external nonpayable returns (bool)
```



*Atomically decreases the allowance granted to `spender` by the caller. This is an alternative to {approve} that can be used as a mitigation for problems described in {IERC20-approve}. Emits an {Approval} event indicating the updated allowance. Requirements: - `spender` cannot be the zero address. - `spender` must have allowance for the caller of at least `subtractedValue`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| subtractedValue | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```



*Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role&#39;s admin, use {_setRoleAdmin}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### grantRole

```solidity
function grantRole(bytes32 role, address account) external nonpayable
```



*Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```



*Returns `true` if `account` has been granted `role`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external nonpayable returns (bool)
```



*Atomically increases the allowance granted to `spender` by the caller. This is an alternative to {approve} that can be used as a mitigation for problems described in {IERC20-approve}. Emits an {Approval} event indicating the updated allowance. Requirements: - `spender` cannot be the zero address.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| addedValue | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### initialize

```solidity
function initialize(string __name, string __symbol, uint256 __cooldown_seconds, uint256 __unstake_window, contract IAddressRegistry __registry) external nonpayable
```

Initializer allow proxy scheme

*For upgradability its necessary to use initialize instead of simple constructor*

#### Parameters

| Name | Type | Description |
|---|---|---|
| __name | string | Name of the token like `Staked Rand Token ERC20` |
| __symbol | string | Short symbol like `sRND` |
| __cooldown_seconds | uint256 | is the period of cooldown before redeeming in seconds |
| __unstake_window | uint256 | is the period after cooldown in which redeem can happen in seconds |
| __registry | contract IAddressRegistry | is the address of the AddressRegistry |

### name

```solidity
function name() external view returns (string)
```



*Returns the name of the token.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### pause

```solidity
function pause() external nonpayable
```






### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### redeem

```solidity
function redeem(uint256 amount) external nonpayable
```

Redeems the staked token without vesting, updates rewards and transfers funds

*Only used for non-vesting token redemption, needs to wait cooldown*

#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | is the uint256 amount to redeem |

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function&#39;s purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the caller must be `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### rewardToken

```solidity
function rewardToken() external view returns (contract IERC20Upgradeable)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20Upgradeable | undefined |

### stake

```solidity
function stake(uint256 amount) external nonpayable
```

Enables staking for non-vesting investors



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | is the uint256 amount to stake |

### stakerCooldown

```solidity
function stakerCooldown(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```



*See {IERC165-supportsInterface}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### symbol

```solidity
function symbol() external view returns (string)
```



*Returns the symbol of the token, usually a shorter version of the name.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```



*See {IERC20-totalSupply}.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### transfer

```solidity
function transfer(address recipient, uint256 amount) external nonpayable returns (bool)
```



*See {IERC20-transfer}. Requirements: - `recipient` cannot be the zero address. - the caller must have a balance of at least `amount`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferFrom

```solidity
function transferFrom(address sender, address recipient, uint256 amount) external nonpayable returns (bool)
```



*See {IERC20-transferFrom}. Emits an {Approval} event indicating the updated allowance. This is not required by the EIP. See the note at the beginning of {ERC20}. Requirements: - `sender` and `recipient` cannot be the zero address. - `sender` must have a balance of at least `amount`. - the caller must have allowance for ``sender``&#39;s tokens of at least `amount`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined |
| recipient | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### unpause

```solidity
function unpause() external nonpayable
```






### updateAsset

```solidity
function updateAsset(address _asset, uint256 _emission, uint256 _totalStaked) external nonpayable
```

Exposed function to update an asset with new emission rate

*Calls the _updateAsset of RewardDistributionManager*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _asset | address | is the address of the asset to update |
| _emission | uint256 | is the rate of emission in seconds to update to |
| _totalStaked | uint256 | is total amount of stake for the asset |

### updateCooldownPeriod

```solidity
function updateCooldownPeriod(uint256 newPeriod) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newPeriod | uint256 | undefined |

### updateRegistryAddress

```solidity
function updateRegistryAddress(contract IAddressRegistry newAddress) external nonpayable
```

Function to let Rand to update the address of the Safety Module

*emits RegistryAddressUpdated() and only accessible by MultiSig*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress | contract IAddressRegistry | where the new Safety Module contract is located |

### updateUnstakePeriod

```solidity
function updateUnstakePeriod(uint256 newPeriod) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newPeriod | uint256 | undefined |

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external nonpayable
```



*Upgrade the implementation of the proxy to `newImplementation`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```



*Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |
| data | bytes | undefined |



## Events

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousAdmin  | address | undefined |
| newAdmin  | address | undefined |

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| value  | uint256 | undefined |

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

### BeaconUpgraded

```solidity
event BeaconUpgraded(address indexed beacon)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| beacon `indexed` | address | undefined |

### Cooldown

```solidity
event Cooldown(address indexed user)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### PeriodUpdated

```solidity
event PeriodUpdated(string periodType, uint256 newAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| periodType  | string | undefined |
| newAmount  | uint256 | undefined |

### RedeemStaked

```solidity
event RedeemStaked(address indexed user, address indexed recipient, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| recipient `indexed` | address | undefined |
| amount  | uint256 | undefined |

### RegistryAddressUpdated

```solidity
event RegistryAddressUpdated(contract IAddressRegistry newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress  | contract IAddressRegistry | undefined |

### RewardsAccrued

```solidity
event RewardsAccrued(address indexed user, uint256 rewardAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| rewardAmount  | uint256 | undefined |

### RewardsClaimed

```solidity
event RewardsClaimed(address indexed user, uint256 rewardAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| rewardAmount  | uint256 | undefined |

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| previousAdminRole `indexed` | bytes32 | undefined |
| newAdminRole `indexed` | bytes32 | undefined |

### RoleGranted

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### RoleRevoked

```solidity
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### Staked

```solidity
event Staked(address indexed user, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| amount  | uint256 | undefined |

### StakedOnTokenId

```solidity
event StakedOnTokenId(address indexed user, uint256 indexed tokenId, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| tokenId `indexed` | uint256 | undefined |
| amount  | uint256 | undefined |

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| value  | uint256 | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation `indexed` | address | undefined |

### UserIndexUpdated

```solidity
event UserIndexUpdated(address asset, uint256 index)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset  | address | undefined |
| index  | uint256 | undefined |



