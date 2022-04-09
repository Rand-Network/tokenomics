# RewardDistributionManagerV2
*Inherited by the SafetyModuleERC20*
Manages the rewards of staked tokens
## _updateAsset

*Need to expose on inherited contract with access control (preferably controlled by multisig)*

Allow update of the asset emissions


| Input/Output | Data Type | Variable Name | Comment                                           |
| ------------ | --------- | ------------- | ------------------------------------------------- |
| input        | address   | _asset        | address of the asset which emission is controlled |
| input        | uint256   | _emission     | the emission rate in seconds                      |
| input        | uint256   | _totalStaked  | the total staked assets at the moment of update   |

## _updateAssetState

*Needs implementation in staking logic in SM*

Updates assets state indices


| Input/Output | Data Type | Variable Name | Comment                                         |
| ------------ | --------- | ------------- | ----------------------------------------------- |
| input        | address   | _asset        | address of the asset which is updated           |
| input        | uint256   | _totalStaked  | the total staked assets at the moment of update |
| output       | uint256   | N/A           | newIdx the updated index state of the asset     |

## _updateUserAssetState

*Needs implementation in staking logic in SM*

Updates user's index for an asset


| Input/Output | Data Type | Variable Name | Comment                                                                      |
| ------------ | --------- | ------------- | ---------------------------------------------------------------------------- |
| input        | address   | _user         | address of the user                                                          |
| input        | address   | _asset        | address of the asset which is updated                                        |
| input        | uint256   | _userStake    | the total staked assets of the user at the moment of update                  |
| input        | uint256   | _totalStaked  | the total staked assets at the moment of update                              |
| output       | uint256   | N/A           | accruedRewards which is total accumulated rewards for the user at the update |

## _newAssetIndex

*Used in the `_updateAssetState` function*

Calculates a new index for the asset


| Input/Output | Data Type | Variable Name        | Comment                            |
| ------------ | --------- | -------------------- | ---------------------------------- |
| input        | uint256   | _currentIdx          | current index of the asset         |
| input        | uint256   | _emission            | current emission rate of the asset |
| input        | uint256   | _lastUpdateTimestamp | last update timestamp of the asset |
| input        | uint256   | _totalBalance        | total amount of tokens staked      |
| output       | uint256   | N/A                  | the calculated new index           |

## _calculateRewards

*Explain to a developer any extra details*

Calculates rewards for a user based on indices


| Input/Output | Data Type | Variable Name | Comment                     |
| ------------ | --------- | ------------- | --------------------------- |
| input        | uint256   | _userBalance  | the balance of the user     |
| input        | uint256   | _assetIdx     | index state of the asset    |
| input        | uint256   | _userIdx      | index state of the user     |
| output       | uint256   | N/A           | the calculated user rewards |

## _getUnclaimedRewards

*Needs adoption in the inherting contract*

Calculates unclaimed rewards for a user over all tracked assets


| Input/Output | Data Type | Variable Name | Comment                                                       |
| ------------ | --------- | ------------- | ------------------------------------------------------------- |
| input        | address   | _user         | address of the user                                           |
| input        | uint256   | _userStake    | total balance staked of the user                              |
| input        | uint256   | _totalSupply  | total supply of asset                                         |
| output       | uint256   | N/A           | accruedRewards which is total of all rewards over every asset |

