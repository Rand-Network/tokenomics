// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/// @title Rand.network RewardDistributionManagerV2
/// @author @adradr - Adrian Lenard
/// @notice Manages the rewards of staked tokens
/// @dev Inherited by the SafetyModuleERC20
contract RewardDistributionManagerV2 is ContextUpgradeable {
    event AssetUpdated(address asset, uint256 newEmission);
    event AssetIndexUpdated(address asset, uint256 index);
    event UserIndexUpdated(address asset, uint256 index);

    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct AssetData {
        uint256 emissionRate;
        uint256 lastUpdateTimestamp;
        uint256 assetIndex;
        mapping(address => uint256) userIndex;
    }
    // RND and RND/TOKEN BPT will be the two asset we manage
    mapping(address => AssetData) public assets;
    address[] public trackedAssets;
    IERC20Upgradeable public rewardToken;

    uint256 public constant PRECISION = 18;

    /// @notice Allow update of the asset emissions
    /// @dev Need to expose on inherited contract with access control (preferably controlled by multisig)
    /// @param _asset address of the asset which emission is controlled
    /// @param _emission the emission rate in seconds
    /// @param _totalStaked the total staked assets at the moment of update
    function _updateAsset(
        address _asset,
        uint256 _emission,
        uint256 _totalStaked
    ) internal {
        // Check if _asset already exists, add to trackedAssets[] if not
        bool isExistsIntrackedAssets = false;
        uint256 trackedAssetsLength = trackedAssets.length;
        for (uint256 i; i < trackedAssetsLength; i++) {
            if (trackedAssets[i] == _asset) {
                isExistsIntrackedAssets = true;
                break;
            }
        }
        if (!isExistsIntrackedAssets) trackedAssets.push(_asset);
        // Update asset configuration
        _updateAssetState(_asset, _totalStaked);
        assets[_asset].emissionRate = _emission;
        emit AssetUpdated(_asset, _emission);
    }

    /// @notice Updates assets state indices
    /// @dev Needs implementation in staking logic in SM
    /// @param _asset address of the asset which is updated
    /// @param _totalStaked the total staked assets at the moment of update
    /// @return newIdx the updated index state of the asset
    function _updateAssetState(
        address _asset,
        uint256 _totalStaked
    ) internal returns (uint256) {
        AssetData storage asset = assets[_asset];

        // If there are no updates since return original idx
        if (block.timestamp == asset.lastUpdateTimestamp) {
            return asset.assetIndex;
        }

        // Get a new idx for the asset
        uint256 newIdx = _newAssetIndex(
            asset.assetIndex,
            asset.emissionRate,
            asset.lastUpdateTimestamp,
            _totalStaked
        );

        // Update idx for asset if it different from previous
        if (newIdx != asset.assetIndex) {
            asset.assetIndex = newIdx;
            emit AssetIndexUpdated(_asset, newIdx);
        }

        // Update lastUpdateTimestamp
        asset.lastUpdateTimestamp = block.timestamp;

        return newIdx;
    }

    /// @notice Updates user's index for an asset
    /// @dev Needs implementation in staking logic in SM
    /// @param _user address of the user
    /// @param _asset address of the asset which is updated
    /// @param _userStake the total staked assets of the user at the moment of update
    /// @param _totalStaked the total staked assets at the moment of update
    /// @return accruedRewards which is total accumulated rewards for the user at the update
    function _updateUserAssetState(
        address _user,
        address _asset,
        uint256 _userStake,
        uint256 _totalStaked
    ) internal returns (uint256) {
        uint256 accruedRewards;
        AssetData storage asset = assets[_asset];

        // Get new idx for the user
        uint256 newIdx = _updateAssetState(_asset, _totalStaked);

        // Calculate accrued rewards for user if idx differs from previous
        if (newIdx != asset.userIndex[_user]) {
            if (_userStake != 0) {
                accruedRewards = _calculateRewards(
                    _userStake,
                    newIdx,
                    asset.userIndex[_user]
                );
            }
            // Save new idx for user
            asset.userIndex[_user] = newIdx;
            emit UserIndexUpdated(_asset, newIdx);
        }

        return accruedRewards;
    }

    /// @notice Calculates a new index for the asset
    /// @dev Used in the `_updateAssetState` function
    /// @param _currentIdx current index of the asset
    /// @param _emission current emission rate of the asset
    /// @param _lastUpdateTimestamp last update timestamp of the asset
    /// @param _totalBalance total amount of tokens staked
    /// @return the calculated new index
    function _newAssetIndex(
        uint256 _currentIdx,
        uint256 _emission,
        uint256 _lastUpdateTimestamp,
        uint256 _totalBalance
    ) internal view returns (uint256) {
        // Safety checks to ensure idx is not changed when emission, total balance or lastUpdateTimestamp is zero
        if (_emission == 0 || _totalBalance == 0 || _lastUpdateTimestamp == 0) {
            return _currentIdx;
        }

        // Return the increase idx number by taking the emission for the spent time and divide with the total balance
        uint256 timedelta = block.timestamp - _lastUpdateTimestamp;

        return
            ((_emission * timedelta * (10 ** PRECISION)) / _totalBalance) +
            _currentIdx;
    }

    /// @notice Calculates rewards for a user based on indices
    /// @dev Explain to a developer any extra details
    /// @param _userBalance the balance of the user
    /// @param _assetIdx index state of the asset
    /// @param _userIdx index state of the user
    /// @return the calculated user rewards
    function _calculateRewards(
        uint256 _userBalance,
        uint256 _assetIdx,
        uint256 _userIdx
    ) internal pure returns (uint256) {
        return (_userBalance * (_assetIdx - _userIdx)) / (10 ** (PRECISION));
    }

    /// @notice Calculates unclaimed rewards for a user over all tracked assets
    /// @dev Needs adoption in the inherting contract
    /// @param _user address of the user
    /// @param _userStake total balance staked of the user
    /// @param _totalSupply total supply of asset
    /// @return accruedRewards which is total of all rewards over every asset
    function _getUnclaimedRewards(
        address _user,
        uint256 _userStake,
        uint256 _totalSupply
    ) internal view returns (uint256) {
        uint256 accruedRewards = 0;

        for (uint256 i; i < trackedAssets.length; i++) {
            AssetData storage trackedAssetData = assets[trackedAssets[i]];
            uint256 assetIndex = _newAssetIndex(
                trackedAssetData.assetIndex,
                trackedAssetData.emissionRate,
                trackedAssetData.lastUpdateTimestamp,
                _totalSupply
            );

            accruedRewards += _calculateRewards(
                _userStake,
                assetIndex,
                trackedAssetData.userIndex[_user]
            );
        }
        return accruedRewards;
    }
}
