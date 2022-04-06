// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./RewardDistributionManagerV2.sol";
import "./IVestingControllerERC721.sol";
import "./IRandToken.sol";
import "./IAddressRegistry.sol";

// [] REWARDS_VAULT implementation - how to handle rewards, where are they accumulated?
// [x] rewards avaiable to claim are going to be RND only? What does BPT will generate?
//     - rewards are going be only RND
// [] setting the REWARD_TOKEN should be done with Registry or Init param

/// @title Rand.network ERC20 Safety Module
/// @author @adradr - Adrian Lenard
/// @notice Customized implementation of the OpenZeppelin ERC20 standard to be used for the Safety Module
contract SafetyModuleERC20 is
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    RewardDistributionManagerV2
{
    event Staked(address indexed user, uint256 amount);
    event StakedOnTokenId(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount
    );
    event Cooldown(address indexed user);
    event RedeemStaked(
        address indexed user,
        address indexed recipient,
        uint256 amount
    );
    event RewardsAccrued(address indexed user, uint256 rewardAmount);
    event RewardsClaimed(address indexed user, uint256 rewardAmount);
    event RegistryAddressUpdated(IAddressRegistry newAddress);
    event PeriodUpdated(string periodType, uint256 newAmount);

    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 public COOLDOWN_SECONDS;
    uint256 public UNSTAKE_WINDOW;

    IAddressRegistry public REGISTRY;

    IRandToken public REWARD_TOKEN;
    IERC20Upgradeable public POOL_TOKEN;
    address public REWARDS_VAULT;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address => uint256) rewardsToclaim;
    mapping(address => mapping(address => uint256)) public onBehalf;
    mapping(address => uint256) public stakerCooldown;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param _name Name of the token like `Staked Rand Token ERC20`
    /// @param _symbol Short symbol like `sRND`
    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _cooldown_seconds,
        uint256 _unstake_window,
        IAddressRegistry _registry
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __Pausable_init();
        __AccessControl_init();

        REGISTRY = _registry;
        address _multisigVault = REGISTRY.getAddress("MS");
        address _reserve = REGISTRY.getAddress("RES");
        address _reward = REGISTRY.getAddress("RND");

        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);

        __RewardDistributionManager_init(_multisigVault);

        COOLDOWN_SECONDS = _cooldown_seconds;
        UNSTAKE_WINDOW = _unstake_window;
        REWARDS_VAULT = _reserve;
        REWARD_TOKEN = IRandToken(_reward);
    }

    function updateAsset(
        address _asset,
        uint256 _emission,
        uint256 _totalStaked
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateAsset(_asset, _emission, _totalStaked);
    }

    function cooldown() public {
        require(
            balanceOf(_msgSender()) > 0,
            "SM: No staked balance to cooldown"
        );
        stakerCooldown[_msgSender()] = block.timestamp;
        emit Cooldown(_msgSender());
    }

    modifier redeemable(uint256 amount) {
        require(amount > 0, "SM: Redeem amount cannot be zero");
        require(
            balanceOf(_msgSender()) >= amount,
            "SM: Not enough staked balance"
        );
        require(stakerCooldown[_msgSender()] > 0, "SM: No cooldown initiated");
        require(
            block.timestamp > stakerCooldown[_msgSender()] + COOLDOWN_SECONDS,
            "SM: Still under cooldown period"
        );
        // If unstake period is passed, reset cooldown for user
        if (
            block.timestamp >
            stakerCooldown[_msgSender()] + COOLDOWN_SECONDS + UNSTAKE_WINDOW
        ) {
            stakerCooldown[_msgSender()] = 0;
            require(
                block.timestamp -
                    stakerCooldown[_msgSender()] +
                    COOLDOWN_SECONDS <=
                    UNSTAKE_WINDOW,
                "SM: Unstake period finished, cooldown reset"
            );
        }
        _;
    }

    function redeem(uint256 amount) public redeemable(amount) {
        require(amount != 0, "SM: Redeem amount cannot be zero");

        uint256 balanceOfMsgSender = balanceOf(_msgSender());
        amount = (amount > balanceOfMsgSender) ? balanceOfMsgSender : amount;
        _updateUnclaimedRewards(_msgSender(), balanceOfMsgSender, true);

        _redeemOnRND(amount);
        emit RedeemStaked(_msgSender(), _msgSender(), amount);
    }

    function redeem(uint256 tokenId, uint256 amount) public redeemable(amount) {
        require(amount != 0, "SM: Redeem amount cannot be zero");

        uint256 balanceOfMsgSender = balanceOf(_msgSender());
        amount = (amount > balanceOfMsgSender) ? balanceOfMsgSender : amount;
        _updateUnclaimedRewards(_msgSender(), balanceOfMsgSender, true);

        _redeemOnTokenId(tokenId, amount);
        emit RedeemStaked(_msgSender(), _msgSender(), amount);
    }

    function _redeemOnTokenId(uint256 tokenId, uint256 amount) internal {
        // Fetching address from registry
        address _vc = REGISTRY.getAddress("VC");
        uint256 vcBalanceOfStaker = onBehalf[_msgSender()][_vc];
        require(
            vcBalanceOfStaker >= amount,
            "SM: Redeem amount is higher than avaiable on staked VC token"
        );
        // Update amount and cooldown and burn tokens
        onBehalf[_msgSender()][address(_vc)] -= amount;
        if (balanceOf(_msgSender()) - amount == 0) {
            stakerCooldown[_msgSender()] = 0;
        }
        _burn(_msgSender(), amount);

        // Get investment info and modify staked amount
        (, , , , uint256 rndStakedAmount) = IVestingControllerERC721(_vc)
            .getInvestmentInfo(tokenId);
        IVestingControllerERC721(_vc).modifyStakedAmount(
            tokenId,
            rndStakedAmount - amount
        );

        // Transfer tokens
        IRandToken(REGISTRY.getAddress("RND")).transfer(address(_vc), amount);
    }

    function _redeemOnRND(uint256 amount) internal {
        _burn(_msgSender(), amount);
        onBehalf[_msgSender()][_msgSender()] -= amount;
        if (balanceOf(_msgSender()) - amount == 0) {
            stakerCooldown[_msgSender()] = 0;
        }
        IRandToken(REGISTRY.getAddress("RND")).transfer(_msgSender(), amount);
    }

    function stake(uint256 tokenId, uint256 amount) public {
        require(amount != 0, "SM: Stake amount cannot be zero");
        uint256 rewards = _updateUserAssetState(
            _msgSender(),
            address(this),
            balanceOf(_msgSender()),
            totalSupply()
        );
        if (rewards != 0) {
            rewardsToclaim[_msgSender()] += rewards;
        }
        _stakeOnTokenId(tokenId, amount);
        emit StakedOnTokenId(_msgSender(), tokenId, amount);
    }

    function stake(uint256 amount) public {
        require(amount != 0, "SM: Stake amount cannot be zero");
        uint256 rewards = _updateUserAssetState(
            _msgSender(),
            address(this),
            balanceOf(_msgSender()),
            totalSupply()
        );
        if (rewards != 0) {
            rewardsToclaim[_msgSender()] += rewards;
        }
        _stakeOnRND(amount);
        emit Staked(_msgSender(), amount);
    }

    function _stakeOnPoolTokens(uint256 amount) internal {
        // Requires approve from user
        IERC20Upgradeable(REGISTRY.getAddress("BPT")).transferFrom(
            _msgSender(),
            address(this),
            amount
        );
        // SM registers staked amount in SM storage
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
    }

    function _stakeOnRND(uint256 amount) internal {
        IRandToken(REGISTRY.getAddress("RND")).approveAndTransfer(
            _msgSender(),
            address(this),
            amount
        );
        // SM registers staked amount in SM storage
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
    }

    function _stakeOnTokenId(uint256 tokenId, uint256 amount) internal {
        // Fetching address from registry
        address _vc = REGISTRY.getAddress("VC");

        require(
            IVestingControllerERC721(_vc).ownerOf(tokenId) == _msgSender(),
            "SM: Can only stake own VC tokens"
        );
        // Get stakeable amount from VC
        (
            uint256 rndTokenAmount,
            uint256 rndClaimedAmount,
            ,
            ,
            uint256 rndStakedAmount
        ) = IVestingControllerERC721(_vc).getInvestmentInfo(tokenId);
        require(
            rndTokenAmount - rndClaimedAmount - rndStakedAmount >= amount,
            "SM: Not enough stakable amount on VC tokenId"
        );

        IRandToken(REGISTRY.getAddress("RND")).approveAndTransfer(
            _vc,
            address(this),
            amount
        );

        // Set onBehalf amounts
        onBehalf[_msgSender()][_vc] += amount;

        // Register staked amount on VC
        uint256 newStakedAmount = rndStakedAmount + amount;
        IVestingControllerERC721(_vc).modifyStakedAmount(
            tokenId,
            newStakedAmount
        );
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
    }

    function calculateTotalRewards(address _user)
        public
        view
        returns (uint256)
    {
        uint256 totalRewards = _getUnclaimedRewards(
            _user,
            balanceOf(_user),
            totalSupply()
        );

        return totalRewards + rewardsToclaim[_user];
    }

    function claimRewards(uint256 _amount) public {
        uint256 totalRewards = _updateUnclaimedRewards(
            _msgSender(),
            balanceOf(_msgSender()),
            false
        );
        rewardsToclaim[_msgSender()] = totalRewards - _amount;

        REWARD_TOKEN.approveAndTransfer(REWARDS_VAULT, _msgSender(), _amount);

        emit RewardsClaimed(_msgSender(), _amount);
    }

    function _updateUnclaimedRewards(
        address _user,
        uint256 _userStake,
        bool _update
    ) internal returns (uint256) {
        uint256 rewards = _updateUserAssetState(
            _user,
            address(this),
            _userStake,
            totalSupply()
        );

        uint256 totalRewards = rewardsToclaim[_user] + rewards;

        if (rewards != 0) {
            if (_update) {
                rewardsToclaim[_user] = totalRewards;
            }
            emit RewardsAccrued(_user, rewards);
        }

        return totalRewards;
    }

    /// @notice Function to let Rand to update the address of the Safety Module
    /// @dev emits RegistryAddressUpdated() and only accessible by MultiSig
    /// @param newAddress where the new Safety Module contract is located
    function updateRegistryAddress(IAddressRegistry newAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        REGISTRY = newAddress;
        emit RegistryAddressUpdated(newAddress);
    }

    function updateCooldownPeriod(uint256 newPeriod)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        COOLDOWN_SECONDS = newPeriod;
        emit PeriodUpdated("Cooldown", newPeriod);
    }

    function updateUnstakePeriod(uint256 newPeriod)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        UNSTAKE_WINDOW = newPeriod;
        emit PeriodUpdated("Unstake", newPeriod);
    }

    function burn(address account, uint256 amount)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _burn(account, amount);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(
            msg.sender == address(this),
            "SM: Cannot transfer staked tokens"
        );
        super._transfer(sender, recipient, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
