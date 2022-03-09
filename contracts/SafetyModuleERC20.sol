// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IVestingControllerERC721.sol";
import "./IRandToken.sol";
import "./IAddressRegistry.sol";

/// @title Rand.network ERC20 Safety Module
/// @author @adradr - Adrian Lenard
/// @notice Customized implementation of the OpenZeppelin ERC20 standard to be used for the Safety Module
contract SafetyModuleERC20 is
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    event Staked(uint256 amount);
    event StakedOnTokenId(uint256 tokenId, uint256 amount);
    event CooldownStaked(address staker);
    event RedeemStaked(address staker, address recipient, uint256 amount);
    event RegistryAddressUpdated(IAddressRegistry newAddress);

    using SafeERC20Upgradeable for IERC20Upgradeable;

    // IVestingControllerERC721 public VC_TOKEN;
    // IRandToken public RND_TOKEN;

    uint256 public COOLDOWN_SECONDS;
    uint256 public UNSTAKE_WINDOW;

    IAddressRegistry public REGISTRY;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address => uint256) rewards;
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
        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);

        COOLDOWN_SECONDS = _cooldown_seconds;
        UNSTAKE_WINDOW = _unstake_window;
    }

    function cooldown() public {
        require(
            balanceOf(_msgSender()) > 0,
            "SM: No staked balance to cooldown"
        );
        stakerCooldown[_msgSender()] = block.timestamp;
        emit CooldownStaked(_msgSender());
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

    modifier amountChecking() {
        /////// CAN BE DELETED IN FINAL /////////
        uint256 balanceOfStaker = balanceOf(_msgSender());
        uint256 vcBalanceOfStaker = onBehalf[_msgSender()][
            REGISTRY.getAddress("VC")
        ];
        uint256 ownBalanceOfStaker = onBehalf[_msgSender()][_msgSender()];

        require(
            balanceOfStaker == vcBalanceOfStaker + ownBalanceOfStaker,
            "SM: Unequal tokens minted and onBehalf amounts"
        );
        _;
        /////// CAN BE DELETED IN FINAL /////////
    }

    function redeem(uint256 tokenId, uint256 amount)
        public
        redeemable(amount)
        amountChecking
    {
        // Redeem without vesting investment
        if (tokenId == 0) {
            _redeemOnRND(amount, _msgSender());
        } else {
            // Redeem on vesting investment token
            _redeemOnTokenId(tokenId, amount);
        }

        emit RedeemStaked(_msgSender(), _msgSender(), amount);
    }

    function redeem(
        uint256 tokenId,
        uint256 amount,
        address recipient
    ) public redeemable(amount) amountChecking {
        // Redeem without vesting investment
        if (tokenId == 0) {
            _redeemOnRND(amount, recipient);
        } else {
            // Redeem on vesting investment token
            _redeemOnTokenId(tokenId, amount);
        }

        emit RedeemStaked(_msgSender(), recipient, amount);
    }

    function _redeemOnTokenId(uint256 tokenId, uint256 amount) internal {
        uint256 vcBalanceOfStaker = onBehalf[_msgSender()][
            REGISTRY.getAddress("VC")
        ];
        require(
            vcBalanceOfStaker >= amount,
            "SM: Redeem amount is higher than avaiable on staked VC token"
        );

        // Fetching address from registry
        address _vc = REGISTRY.getAddress("VC");

        // Update amounts and burn tokens
        onBehalf[_msgSender()][address(_vc)] -= amount;
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

    function _redeemOnRND(uint256 amount, address recipient) internal {
        _burn(_msgSender(), amount);
        onBehalf[_msgSender()][_msgSender()] -= amount;
        IRandToken(REGISTRY.getAddress("RND")).transfer(recipient, amount);
    }

    function stake(uint256 tokenId, uint256 amount) public {
        require(amount != 0, "SM: Stake amount cannot be zero");
        // Stake without vesting investment
        if (tokenId == 0) {
            _stakeOnRND(amount);
        } else {
            // Stake on vesting investment token
            _stakeOnTokenId(tokenId, amount);
        }
    }

    function _stakeOnRND(uint256 amount) internal {
        IRandToken(REGISTRY.getAddress("RND")).approveAndTransfer(
            _msgSender(),
            address(this),
            amount
        );
        // SM registers staked amount in SM storage and VC storage
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
        emit Staked(amount);
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
        emit StakedOnTokenId(tokenId, amount);
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
    }

    function updateUnstakePeriod(uint256 newPeriod)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        UNSTAKE_WINDOW = newPeriod;
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

    // function transfer(address to, uint256 amount)
    //     public
    //     pure
    //     override
    //     returns (bool)
    // {
    //     revert("SM: Cannot transfer staked tokens");
    // }
    //
    // function transferFrom(
    //     address from,
    //     address to,
    //     uint256 amount
    // ) public pure override returns (bool) {
    //     revert("SM: Cannot transfer staked tokens");
    // }

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
