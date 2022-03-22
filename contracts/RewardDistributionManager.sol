// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

contract RewardDistributionManager is Initializable, ContextUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct AssetData {
        uint256 rewardRate;
        uint256 totalRewardToken;
        uint256 lastUpdateTimestamp;
        //uint256 index;
        mapping(address => uint256) userStakes;
        mapping(address => uint256) userRewardAtStart;
        mapping(address => uint256) rewards;
    }

    // RND and RND/TOKEN BPT will be the two asset we manage
    mapping(address => AssetData) public assets;
    uint256 totalSupply;

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

    function calculateTotalRewardToken() internal view returns (uint256) {
        if (totalSupply == 0) return 0;
        return
            totalRewardToken +
            ((rewardRate * (block.timestamp - lastUpdateTime) * 1e18) /
                totalSupply);
    }

    function earned(address _account) internal view returns (uint256) {
        return
            ((_balances[_account] *
                (calculateTotalRewardToken() - userRewardAtStart[_account])) /
                1e18) + rewards[_account];
    }

    modifier updateReward() {
        totalRewardToken = calculateTotalRewardToken();
        lastUpdateTime = block.timestamp;
        rewards[msg.sender] = earned(msg.sender);
        userRewardAtStart[msg.sender] = totalRewardToken;
        _;
    }
}
