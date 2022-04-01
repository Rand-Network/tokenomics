// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

contract RewardDistributionManagerV2 is Initializable, ContextUpgradeable {
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
    address[] trackedAssets;
    IERC20Upgradeable rewardToken;

    // EMISSION_MANAGER will release funds for distribution
    address public EMISSION_MANAGER;
    uint256 public constant PRECISION = 18;

    //constructor() {}

    function __RewardDistributionManager_init(address _emissionManagerAddress)
        internal
        onlyInitializing
    {
        EMISSION_MANAGER = _emissionManagerAddress;
    }

    // [] implement trackedAssets addition - rethink asset configuration
    function updateAsset(
        address _asset,
        uint256 _emission,
        uint256 _totalStaked
    ) external {
        AssetData storage asset = assets[_asset];
        _updateAssetState(_asset, _totalStaked);
        asset.emissionRate = _emission;
        emit AssetUpdated(_asset, _emission);
    }

    function _updateAssetState(address _asset, uint256 _totalStaked)
        internal
        returns (uint256)
    {
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
            ((_emission * timedelta * (10**PRECISION)) / _totalBalance) +
            _currentIdx;
    }

    function _calculateRewards(
        uint256 _userBalance,
        uint256 _assetIdx,
        uint256 _userIdx
    ) internal pure returns (uint256) {
        return (_userBalance * (_assetIdx - _userIdx)) / (10**(PRECISION));
    }
}
