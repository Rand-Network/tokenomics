# SafetyModuleERC20
Customized implementation of the OpenZeppelin ERC20 standard to be used for the Safety Module
## initialize

*For upgradability its necessary to use initialize instead of simple constructor*

Initializer allow proxy scheme


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|_name|Name of the token like `Staked Rand Token ERC20`|
|input|string|_symbol|Short symbol like `sRND`|
|input|uint256|_cooldown_seconds|undefined|
|input|uint256|_unstake_window|undefined|
|input|undefined|_registry|undefined|

## updateAsset

*Calls the _updateAsset of RewardDistributionManager*

Exposed function to update an asset with new emission rate


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|_asset|is the address of the asset to update|
|input|uint256|_emission|is the rate of emission in seconds to update to|
|input|uint256|_totalStaked|is total amount of stake for the asset|

## cooldown

*Check the actial COOLDOWN_PERIOD for lenght in seconds*

Triggers cooldown period for the caller


## redeem

*Only used for non-vesting token redemption, needs to wait cooldown*

Redeems the staked token without vesting, updates rewards and transfers funds


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|is the uint256 amount to redeem|

## redeem

*Only used for vesting token redemption, needs to wait cooldown*

Redeems the staked token with vesting, updates rewards and transfers funds


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of the vesting token to redeem|
|input|uint256|amount|is the uint256 amount to redeem|

## _redeemOnTokenId

*Interacts with the vesting controller*

Internal function to handle the vesting token based stake redemption


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of the vesting token to redeem|
|input|uint256|amount|is the uint256 amount to redeem|

## _redeemOnRND

Internal function to handle the non-vesting token based stake redemption


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|is the uint256 amount to redeem|

## stake

*Interacts with the vesting controller*

Enables staking for vesting investors


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of the vesting token to stake|
|input|uint256|amount|is the uint256 amount to stake|

## stake

Enables staking for non-vesting investors


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|is the uint256 amount to stake|

## _stakeOnPoolTokens

Enables staking for AMM pool tokens


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|is the uint256 amount to stake|

## _stakeOnRND

Internal function that handles staking for non-vesting investors


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|is the uint256 amount to stake|

## _stakeOnTokenId

*Interacts with the vesting controller*

Internal function that handles staking for vesting investors


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of the vesting token to stake|
|input|uint256|amount|is the uint256 amount to stake|

## calculateTotalRewards

*Uses RewardDistributionManager `_getUnclaimedRewards`*

Calculates the total rewards for a user


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|user|address of the user|
|output|uint256|N/A|total claimable rewards for the user|

## claimRewards

*Uses `_updateUnclaimedRewards`, transfers rewards*

Claims the rewards for a user


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|amount of reward to claim|

## _updateUnclaimedRewards

Updates unclaimed rewards of a suer based on his stake


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|_user|is the address of the user|
|input|uint256|_userStake|is the total staked balance of user|
|input|bool|_update|if to update the `rewardsToclaim` mapping|
|output|uint256|N/A|totalRewards of the user|

## updateRegistryAddress

*emits RegistryAddressUpdated() and only accessible by MultiSig*

Function to let Rand to update the address of the Safety Module


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|undefined|newAddress|where the new Safety Module contract is located|

## updateCooldownPeriod

## updateUnstakePeriod

## burn

## pause

## unpause

## _beforeTokenTransfer

## _transfer

*It is blocked for all address other than this contract     @inheritdoc	ERC20Upgradeable*

Internal _transfer of the SM token


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|sender||
|input|address|recipient||
|input|uint256|amount||

## _authorizeUpgrade

