// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

contract RewardDistributionManager is Initializable, ContextUpgradeable {
    event EmissionRateUpdated(address asset, uint256 newEmission);

    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct AssetData {
        uint256 emissionRate;
        uint256 totalRewardToken;
        uint256 lastUpdateTimestamp;
        //uint256 index;
        mapping(address => uint256) userStakes;
        mapping(address => uint256) userRewardAtStart;
        mapping(address => uint256) rewards;
    }

    // RND and RND/TOKEN BPT will be the two asset we manage
    mapping(address => AssetData) public assets;
    uint256 stakedTotalSupply;
    IERC20Upgradeable rewardToken;

    // EMISSION_MANAGER will release funds for distribution
    address public EMISSION_MANAGER;
    uint8 public constant PRECISION = 18;

    //constructor() {}

    function __RewardDistributionManager_init(address _emissionManagerAddress)
        internal
        onlyInitializing
    {
        EMISSION_MANAGER = _emissionManagerAddress;
    }

    function _updateEmissionOnAsset(address _asset, uint256 _emission)
        internal
    {
        assets[_asset].emissionRate = _emission;
        emit EmissionRateUpdated(_asset, _emission);
    }

    function _calculateTotalRewardToken(address _asset)
        internal
        view
        returns (uint256)
    {
        if (stakedTotalSupply == 0) return 0;
        return
            assets[_asset].totalRewardToken +
            ((assets[_asset].emissionRate *
                (block.timestamp - assets[_asset].lastUpdateTimestamp) *
                1e18) / stakedTotalSupply);
    }

    function _earned(address _asset, address _account)
        internal
        view
        returns (uint256)
    {
        return
            ((assets[_asset].userStakes[_account] *
                (_calculateTotalRewardToken(_asset) -
                    assets[_asset].userRewardAtStart[_account])) / 1e18) +
            assets[_asset].rewards[_account];
    }

    // Used in stake / redeem / _getReward
    modifier updateReward(address _asset) {
        assets[_asset].totalRewardToken = _calculateTotalRewardToken(_asset);
        assets[_asset].lastUpdateTimestamp = block.timestamp;
        assets[_asset].rewards[_msgSender()] = _earned(_asset, _msgSender());
        assets[_asset].userRewardAtStart[_msgSender()] = assets[_asset]
            .totalRewardToken;
        _;
    }

    function claimableRewards(address _asset) public view returns (uint256) {
        return _earned(_asset, _msgSender());
    }

    function _getReward(address _asset) internal updateReward(_asset) {
        uint256 reward = assets[_asset].rewards[_msgSender()];
        assets[_asset].rewards[_msgSender()] = 0;
        rewardToken.transfer(_msgSender(), reward);
    }
}
