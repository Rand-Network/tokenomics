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
    event VCAddressUpdated(IVestingControllerERC721 newAddress);
    event RNDAddressUpdated(IRandToken newAddress);
    event CooldownStaked(address staker);
    event RedeemStaked(address staker, address recipient, uint256 amount);

    using SafeERC20Upgradeable for IERC20Upgradeable;
    IVestingControllerERC721 public VC_TOKEN;
    IRandToken public RND_TOKEN;
    uint256 public COOLDOWN_SECONDS;
    uint256 public UNSTAKE_WINDOW;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

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
        address _multisigVault,
        address _backendAddress,
        IRandToken _rndTokenContract,
        IVestingControllerERC721 _vcTokenContract,
        uint256 _cooldown_seconds,
        uint256 _unstake_window
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __Pausable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(BACKEND_ROLE, _backendAddress);

        RND_TOKEN = _rndTokenContract;
        VC_TOKEN = _vcTokenContract;
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

    // // Redeems users staked tokens after cooldown period ended and still within unstake window
    // // If the user is a vesting investor then his vested tokens will be prioritized for redemption
    // function redeem(address recipient, uint256 amount) public {
    //     require(amount > 0, "SM: Redeem amount cannot be zero");
    //     require(
    //         balanceOf(_msgSender()) >= amount,
    //         "SM: Not enough staked balance"
    //     );
    //     require(stakerCooldown[_msgSender()] > 0, "SM: No cooldown initiated");
    //     require(
    //         block.timestamp > stakerCooldown[_msgSender()] + COOLDOWN_SECONDS,
    //         "SM: Still under cooldown period"
    //     );
    //     // If unstake period is passed, reset cooldown for user
    //     if (
    //         block.timestamp >
    //         stakerCooldown[_msgSender()] + COOLDOWN_SECONDS + UNSTAKE_WINDOW
    //     ) {
    //         stakerCooldown[_msgSender()] = 0;
    //         require(
    //             block.timestamp -
    //                 stakerCooldown[_msgSender()] +
    //                 COOLDOWN_SECONDS <=
    //                 UNSTAKE_WINDOW,
    //             "SM: Unstake period finished, cooldown reset"
    //         );
    //     }
    //     uint256 balanceOfStaker = balanceOf(_msgSender());
    //     uint256 vcBalanceOfStaker = onBehalf[_msgSender()][address(VC_TOKEN)];
    //     uint256 ownBalanceOfStaker = onBehalf[_msgSender()][_msgSender()];

    //     require(
    //         balanceOfStaker == vcBalanceOfStaker + ownBalanceOfStaker,
    //         "SM: Unequal tokens minted and onBehalf amounts"
    //     );

    //     // If user has only RND
    //     if (amount <= ownBalanceOfStaker) {
    //         onBehalf[_msgSender()][_msgSender()] -= amount;
    //     } else {
    //         // If user also has vesting tokens
    //         // Null his own tokens
    //         balanceOfStaker -= ownBalanceOfStaker;
    //         onBehalf[_msgSender()][_msgSender()] = 0;
    //         // Substract unstaked amount from VC staked amounts
    //         // by iterating over his investment tokens from oldest to newest
    //         uint256 VCbalance = VC_TOKEN.balanceOf(_msgSender());
    //         uint256[] memory tokenIds = new uint256[](VCbalance);
    //         uint256[] memory stakedOnTokenId = new uint256[](VCbalance);

    //         // Iterate over investments
    //         for (uint256 i = 0; i < VCbalance; i++) {
    //             uint256 tokenId = VC_TOKEN.tokenOfOwnerByIndex(_msgSender(), i);
    //             tokenIds[i] = tokenId;
    //             (, , , , uint256 rndStakedAmount) = VC_TOKEN.getInvestmentInfo(
    //                 tokenId
    //             );
    //             stakedOnTokenId[i] = rndStakedAmount;
    //         }
    //         uint256[] memory toUnstakedOnTokenId = new uint256[](
    //             tokenIds.length
    //         );
    //         uint256 toUnstakedOnTokenIdCounter;
    //         // Iterate over investments and get the required amount to unstake
    //         for (uint256 i = 0; i < tokenIds.length; i++) {
    //             if (vcBalanceOfStaker > stakedOnTokenId[i]) {
    //                 toUnstakedOnTokenId[i] = vcBalanceOfStaker;
    //                 vcBalanceOfStaker -= stakedOnTokenId[i];
    //                 toUnstakedOnTokenIdCounter += 1;
    //             } else {
    //                 toUnstakedOnTokenId[i] = vcBalanceOfStaker;
    //                 break;
    //             }
    //         }

    //         // Iterate over unstake amount array and call the modifyStakedAmount on VC
    //         for (uint256 i = 0; i < toUnstakedOnTokenIdCounter; i++) {
    //             // modify staked amount on VC
    //             VC_TOKEN.modifyStakedAmount(
    //                 tokenIds[i],
    //                 toUnstakedOnTokenId[i]
    //             );
    //             onBehalf[_msgSender()][
    //                 address(VC_TOKEN)
    //             ] -= toUnstakedOnTokenId[i];
    //         }
    //     }

    //     // Burn stake tokens
    //     _burn(_msgSender(), amount);
    //     // Transfer RND amount to recipient address or back to VC
    //     // If there is no vesting investment in the amount
    //     if (vcBalanceOfStaker == 0) {
    //         RND_TOKEN.transfer(recipient, amount);
    //     } else {
    //         if (vcBalanceOfStaker > 0 && ownBalanceOfStaker == 0) {
    //             RND_TOKEN.transfer(address(VC_TOKEN), amount);
    //         } else {
    //             // If there is vesting investment also and own
    //             RND_TOKEN.transfer(recipient, ownBalanceOfStaker);
    //             RND_TOKEN.transfer(address(VC_TOKEN), vcBalanceOfStaker);
    //         }
    //     }
    //     // [] could divide event amount into vc amount and vested rnd amounts
    //     emit RedeemStaked(_msgSender(), recipient, amount);
    // }

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

    function redeemNew(
        uint256 tokenId,
        uint256 amount,
        address recipient
    ) public redeemable(amount) {
        /////// CAN BE DELETED IN FINAL /////////
        uint256 balanceOfStaker = balanceOf(_msgSender());
        uint256 vcBalanceOfStaker = onBehalf[_msgSender()][address(VC_TOKEN)];
        uint256 ownBalanceOfStaker = onBehalf[_msgSender()][_msgSender()];

        require(
            balanceOfStaker == vcBalanceOfStaker + ownBalanceOfStaker,
            "SM: Unequal tokens minted and onBehalf amounts"
        );
        /////// CAN BE DELETED IN FINAL /////////

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
        uint256 vcBalanceOfStaker = onBehalf[_msgSender()][address(VC_TOKEN)];
        require(
            vcBalanceOfStaker >= amount,
            "SM: Redeem amount is higher than avaiable on staked VC token"
        );
        onBehalf[_msgSender()][address(VC_TOKEN)] -= amount;

        (, , , , uint256 rndStakedAmount) = VC_TOKEN.getInvestmentInfo(tokenId);
        VC_TOKEN.modifyStakedAmount(tokenId, rndStakedAmount - amount);
        _burn(_msgSender(), amount);
        RND_TOKEN.transfer(address(VC_TOKEN), amount);
    }

    function _redeemOnRND(uint256 amount, address recipient) internal {
        _burn(_msgSender(), amount);
        onBehalf[_msgSender()][_msgSender()] -= amount;
        RND_TOKEN.transfer(recipient, amount);
    }

    function stakeNew(uint256 tokenId, uint256 amount) public {
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
        RND_TOKEN.approveAndTransfer(_msgSender(), address(this), amount);
        // SM registers staked amount in SM storage and VC storage
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
        emit Staked(amount);
    }

    function _stakeOnTokenId(uint256 tokenId, uint256 amount) internal {
        require(
            VC_TOKEN.ownerOf(tokenId) == _msgSender(),
            "SM: Can only stake own VC tokens"
        );
        // Get stakeable amount from VC
        (
            uint256 rndTokenAmount,
            uint256 rndClaimedAmount,
            ,
            ,
            uint256 rndStakedAmount
        ) = VC_TOKEN.getInvestmentInfo(tokenId);
        require(
            rndTokenAmount - rndClaimedAmount - rndStakedAmount >= amount,
            "SM: Not enough stakable amount on VC tokenId"
        );

        RND_TOKEN.approveAndTransfer(address(VC_TOKEN), address(this), amount);

        // Set onBehalf amounts
        onBehalf[_msgSender()][address(VC_TOKEN)] += amount;
        // Register staked amount on VC
        uint256 newStakedAmount = rndStakedAmount + amount;
        VC_TOKEN.modifyStakedAmount(tokenId, newStakedAmount);
        // SM mints sRND tokens for the user
        _mint(_msgSender(), amount);
        emit StakedOnTokenId(tokenId, amount);
    }

    /// @notice Function to let Rand to update the address of the Rand Token
    /// @dev emits RNDAddressUpdated() and only accessible by DEFAULT_ADMIN_ROLE
    /// @param newAddress where the new Rand Token is located
    function updateRNDAddress(IRandToken newAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        RND_TOKEN = newAddress;
        emit RNDAddressUpdated(newAddress);
    }

    /// @notice Function to let Rand to update the address of the VC
    /// @dev emits VCAddressUpdated() and only accessible by DEFAULT_ADMIN_ROLE
    /// @param newAddress where the new VC is located
    function updateVCAddress(IVestingControllerERC721 newAddress)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
    {
        VC_TOKEN = newAddress;
        emit VCAddressUpdated(newAddress);
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

    function updateOnBehalfAmount(
        address addr1,
        address addr2,
        uint256 newAmount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        onBehalf[addr1][addr2] = newAmount;
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

    function transfer(address to, uint256 amount)
        public
        pure
        override
        returns (bool)
    {
        revert("SM: Cannot transfer staked tokens");
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public pure override returns (bool) {
        revert("SM: Cannot transfer staked tokens");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
