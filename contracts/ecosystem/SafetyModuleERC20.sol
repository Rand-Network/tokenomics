// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./RewardDistributionManagerV2.sol";
import "../interfaces/IVestingControllerERC721.sol";
import "../interfaces/IRandToken.sol";
import "./AddressConstants.sol";

/// @title Rand.network ERC20 Safety Module
/// @author @adradr - Adrian Lenard
/// @notice Customized implementation of the OpenZeppelin ERC20 standard to be used for the Safety Module
contract SafetyModuleERC20 is
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    AddressConstants,
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

    // IRandToken public REWARD_TOKEN;
    // IERC20Upgradeable public POOL_TOKEN;
    // address public REWARDS_VAULT;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address => uint256) rewardsToclaim;
    mapping(address => mapping(address => uint256)) public onBehalf;
    mapping(address => uint256) public stakerCooldown;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /// @notice Initializer allow proxy scheme
    /// @dev For upgradability its necessary to use initialize instead of simple constructor
    /// @param name_ Name of the token like `Staked Rand Token ERC20`
    /// @param symbol_ Short symbol like `sRND`
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 _cooldown_seconds,
        uint256 _unstake_window,
        IAddressRegistry _registry
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __Pausable_init();
        __AccessControl_init();

        REGISTRY = _registry;
        address _multisigVault = REGISTRY.getAddress(MULTISIG);
        // address _reserve = REGISTRY.getAddress(ECOSYSTEM_RESERVE);
        // address _reward = REGISTRY.getAddress(RAND_TOKEN);

        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);

        COOLDOWN_SECONDS = _cooldown_seconds;
        UNSTAKE_WINDOW = _unstake_window;
        // REWARDS_VAULT = _reserve;
        // REWARD_TOKEN = IRandToken(_reward);
    }

    /// @notice Exposed function to update an asset with new emission rate
    /// @dev Calls the _updateAsset of RewardDistributionManager
    /// @param _asset is the address of the asset to update
    /// @param _emission is the rate of emission in seconds to update to
    /// @param _totalStaked is total amount of stake for the asset
    function updateAsset(
        address _asset,
        uint256 _emission,
        uint256 _totalStaked
    ) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        _updateAsset(_asset, _emission, _totalStaked);
    }

    /// @notice Triggers cooldown period for the caller
    /// @dev Check the actial COOLDOWN_PERIOD for lenght in seconds
    function cooldown() public whenNotPaused {
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
        } else {
            _;
        }
    }

    /// @notice Redeems the staked token without vesting, updates rewards and transfers funds
    /// @dev Only used for non-vesting token redemption, needs to wait cooldown
    /// @param amount is the uint256 amount to redeem
    function redeem(uint256 amount)
        public
        whenNotPaused
        nonReentrant
        redeemable(amount)
    {
        require(amount != 0, "SM: Redeem amount cannot be zero");

        uint256 balanceOfMsgSender = balanceOf(_msgSender());
        amount = (amount > balanceOfMsgSender) ? balanceOfMsgSender : amount;
        _updateUnclaimedRewards(_msgSender(), balanceOfMsgSender, true);

        _redeemOnRND(amount);
        emit RedeemStaked(_msgSender(), _msgSender(), amount);
    }

    /// @notice Redeems the staked token with vesting, updates rewards and transfers funds
    /// @dev Only used for vesting token redemption, needs to wait cooldown
    /// @param amount is the uint256 amount to redeem
    /// @param tokenId is the id of the vesting token to redeem
    function redeem(uint256 tokenId, uint256 amount)
        public
        whenNotPaused
        nonReentrant
        redeemable(amount)
    {
        require(amount != 0, "SM: Redeem amount cannot be zero");

        uint256 balanceOfMsgSender = balanceOf(_msgSender());
        amount = (amount > balanceOfMsgSender) ? balanceOfMsgSender : amount;
        _updateUnclaimedRewards(_msgSender(), balanceOfMsgSender, true);

        _redeemOnTokenId(tokenId, amount);
        emit RedeemStaked(_msgSender(), _msgSender(), amount);
    }

    /// @notice Internal function to handle the vesting token based stake redemption
    /// @dev Interacts with the vesting controller
    /// @param tokenId is the id of the vesting token to redeem
    /// @param amount is the uint256 amount to redeem
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
        require(
            IRandToken(REGISTRY.getAddress(RAND_TOKEN)).transfer(
                address(_vc),
                amount
            ),
            "SM: Unable to transfer redeemed tokens"
        );
    }

    /// @notice Internal function to handle the non-vesting token based stake redemption
    /// @param amount is the uint256 amount to redeem
    function _redeemOnRND(uint256 amount) internal {
        _burn(_msgSender(), amount);
        onBehalf[_msgSender()][_msgSender()] -= amount;
        if (balanceOf(_msgSender()) - amount == 0) {
            stakerCooldown[_msgSender()] = 0;
        }
        IRandToken(REGISTRY.getAddress(RAND_TOKEN)).transfer(
            _msgSender(),
            amount
        );
    }

    /// @notice Enables staking for vesting investors
    /// @dev Interacts with the vesting controller
    /// @param tokenId is the id of the vesting token to stake
    /// @param amount is the uint256 amount to stake
    function stake(uint256 tokenId, uint256 amount)
        public
        whenNotPaused
        nonReentrant
    {
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

    /// @notice Enables staking for non-vesting investors
    /// @param amount is the uint256 amount to stake
    function stake(uint256 amount) public whenNotPaused nonReentrant {
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

    /// @notice Enables staking for AMM pool tokens
    /// @param amount is the uint256 amount to stake
    function _stakeOnPoolTokens(uint256 amount) internal {
        // Requires approve from user
        IERC20Upgradeable(REGISTRY.getAddress(BPT_TOKEN)).transferFrom(
            _msgSender(),
            address(this),
            amount
        );
        // SM registers staked amount in SM storage
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
    }

    /// @notice Internal function that handles staking for non-vesting investors
    /// @param amount is the uint256 amount to stake
    function _stakeOnRND(uint256 amount) internal {
        IRandToken(REGISTRY.getAddress(RAND_TOKEN)).approveAndTransfer(
            _msgSender(),
            address(this),
            amount
        );
        // SM registers staked amount in SM storage
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
    }

    /// @notice Internal function that handles staking for vesting investors
    /// @dev Interacts with the vesting controller
    /// @param tokenId is the id of the vesting token to stake
    /// @param amount is the uint256 amount to stake
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
            //rndTokenAmount - rndClaimedAmount - rndStakedAmount >= amount,
            rndTokenAmount >= rndClaimedAmount + rndStakedAmount + amount,
            "SM: Not enough stakable amount on VC tokenId"
        );

        IRandToken(REGISTRY.getAddress(RAND_TOKEN)).approveAndTransfer(
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

    /// @notice Calculates the total rewards for a user
    /// @dev Uses RewardDistributionManager `_getUnclaimedRewards`
    /// @param user address of the user
    /// @return total claimable rewards for the user
    function calculateTotalRewards(address user) public view returns (uint256) {
        uint256 totalRewards = _getUnclaimedRewards(
            user,
            balanceOf(user),
            totalSupply()
        );

        return totalRewards + rewardsToclaim[user];
    }

    /// @notice Claims the rewards for a user
    /// @dev Uses `_updateUnclaimedRewards`, transfers rewards
    /// @param amount amount of reward to claim
    function claimRewards(uint256 amount) public whenNotPaused nonReentrant {
        uint256 totalRewards = _updateUnclaimedRewards(
            _msgSender(),
            balanceOf(_msgSender()),
            false
        );
        rewardsToclaim[_msgSender()] = totalRewards - amount;

        //REWARD_TOKEN.approveAndTransfer(REWARDS_VAULT, _msgSender(), amount);
        IRandToken(REGISTRY.getAddress(RAND_TOKEN)).approveAndTransfer(
            REGISTRY.getAddress(ECOSYSTEM_RESERVE),
            _msgSender(),
            amount
        );

        emit RewardsClaimed(_msgSender(), amount);
    }

    /// @notice Updates unclaimed rewards of a suer based on his stake
    /// @param _user is the address of the user
    /// @param _userStake is the total staked balance of user
    /// @param _update if to update the `rewardsToclaim` mapping
    /// @return totalRewards of the user
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
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        REGISTRY = newAddress;
        emit RegistryAddressUpdated(newAddress);
    }

    function updateCooldownPeriod(uint256 newPeriod)
        public
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        COOLDOWN_SECONDS = newPeriod;
        emit PeriodUpdated("Cooldown", newPeriod);
    }

    function updateUnstakePeriod(uint256 newPeriod)
        public
        whenNotPaused
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        UNSTAKE_WINDOW = newPeriod;
        emit PeriodUpdated("Unstake", newPeriod);
    }

    function burn(address account, uint256 amount)
        public
        whenNotPaused
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

    /// @notice Internal _transfer of the SM token
    /// @dev It is blocked for all address other than this contract
    /// @inheritdoc	ERC20Upgradeable
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
