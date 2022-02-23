// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
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
    ERC20BurnableUpgradeable,
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
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    mapping(address => uint256) rewards;
    mapping(address => mapping(address => uint256)) onBehalf;
    mapping(address => uint256) stakerCooldown;

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
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _multisigVault);
        _grantRole(PAUSER_ROLE, _multisigVault);
        _grantRole(MINTER_ROLE, _multisigVault);
        _grantRole(BURNER_ROLE, _multisigVault);
        _grantRole(BACKEND_ROLE, _backendAddress);

        RND_TOKEN = _rndTokenContract;
        VC_TOKEN = _vcTokenContract;
        COOLDOWN_SECONDS = _cooldown_seconds;
        UNSTAKE_WINDOW = _unstake_window;
    }

    // Stakes the users funds in the SM
    // If the user is a vesting investor then the stake function will use his vested balance first and only later the vested RND
    function stake(uint256 amount) public {
        require(amount != 0, "SM: Stake amount cannot be zero");
        // SM checks if the user has a total token amount he wants to stake
        uint256 alreadyStaked = balanceOf(_msgSender());
        uint256 VCbalance = IVestingControllerERC721(VC_TOKEN).balanceOf(
            _msgSender()
        );
        uint256 availableForStaking;
        uint256 availableForStakingOnVC;
        uint256 availableForStakingOnRND;
        uint256[] memory tokenIds;
        uint256[] memory stakeableOnTokenId;

        // Calculate vesting users balance over his investments
        if (VCbalance > 0) {
            uint256 totalToken;
            uint256 totalClaimed;

            for (uint256 i = 0; i <= VCbalance; i++) {
                uint256 tokenId = IVestingControllerERC721(VC_TOKEN)
                    .tokenOfOwnerByIndex(_msgSender(), i);
                //tokenIds.push(tokenId);
                tokenIds[i] = tokenId;
                (
                    uint256 rndTokenAmount,
                    uint256 rndClaimedAmount,
                    uint256 vestingPeriod,
                    uint256 vestingStartTime,
                    uint256 rndStakedAmount
                ) = IVestingControllerERC721(VC_TOKEN).getInvestmentInfo(
                        tokenId
                    );
                delete (vestingPeriod);
                delete (vestingStartTime);
                delete (rndStakedAmount);
                totalToken += rndTokenAmount;
                totalClaimed += rndClaimedAmount;
                stakeableOnTokenId[i] = rndTokenAmount - rndClaimedAmount;
            }
            availableForStakingOnVC = totalToken - totalClaimed - alreadyStaked;
            // Add simple RND balance
            availableForStakingOnRND += IRandToken(RND_TOKEN).balanceOf(
                _msgSender()
            );
            availableForStaking =
                availableForStakingOnVC +
                availableForStakingOnRND;
        } else {
            // If the user is not a vesting user simply check his RND balance
            availableForStaking = IRandToken(RND_TOKEN).balanceOf(_msgSender());
        }
        require(
            amount <= availableForStaking,
            "SM: Amount is too high to stake, no avaiable stakable balance"
        );

        // SM sets an allowance for itself and transfers RND from VC to SM in amount
        uint256 vc_amount = amount - availableForStakingOnRND;
        uint256 rnd_amount = amount - vc_amount;
        if (availableForStakingOnVC != 0) {
            if (amount > availableForStakingOnVC) {
                // Get from VC and RND
                // Getting allowance from VC and RND
                IVestingControllerERC721(VC_TOKEN).setAllowanceForSM(vc_amount);
                IRandToken(RND_TOKEN).setAllowanceForSM(
                    _msgSender(),
                    rnd_amount
                );
                // Transfer RND from VC to SM
                IVestingControllerERC721(VC_TOKEN).transferFrom(
                    address(VC_TOKEN),
                    address(this),
                    vc_amount
                );
                // Transfer RND from staker to SM
                IRandToken(RND_TOKEN).transferFrom(
                    _msgSender(),
                    address(this),
                    rnd_amount
                );
            } else {
                // Get from VC only
                // Getting allowance from VC
                IVestingControllerERC721(VC_TOKEN).setAllowanceForSM(amount);
                // Transfer RND from VC to SM
                IVestingControllerERC721(VC_TOKEN).transferFrom(
                    address(VC_TOKEN),
                    address(this),
                    vc_amount
                );
            }
        } else {
            // Get from RND only
            // Set increase allowance for SM
            IRandToken(RND_TOKEN).setAllowanceForSM(_msgSender(), amount);
            // Transfer RND from staker to SM
            IRandToken(RND_TOKEN).transferFrom(
                _msgSender(),
                address(this),
                amount
            );
        }

        // SM registers staked amount in SM storage and VC storage
        // Set onBehalf amounts on SM
        onBehalf[_msgSender()][_msgSender()] += rnd_amount > 0 ? rnd_amount : 0;

        if (vc_amount > 0) {
            // Set onBehalf amounts on SM
            onBehalf[_msgSender()][address(VC_TOKEN)] += vc_amount;

            // Loop over investment tokens and register staked amount in historical order from oldest token to newest
            uint256 toStake = vc_amount;

            // If first investment token does not cover stake amount loop through more
            if (toStake > stakeableOnTokenId[0]) {
                for (uint256 i = 0; i <= tokenIds.length; i++) {
                    if (toStake > stakeableOnTokenId[i]) {
                        // If investment[i] does not cover toStake amount
                        IVestingControllerERC721(VC_TOKEN).modifyStakedAmount(
                            tokenIds[i],
                            stakeableOnTokenId[i] <= toStake
                                ? stakeableOnTokenId[i]
                                : toStake
                        );
                        toStake -= stakeableOnTokenId[i];
                    } else {
                        // If investment[i] can cover toStake amount
                        IVestingControllerERC721(VC_TOKEN).modifyStakedAmount(
                            tokenIds[i],
                            toStake
                        );
                        toStake -= toStake;
                    }
                    // Do not continue for loop if toStake is depleated
                    if (toStake == 0) {
                        break;
                    }
                }
            } else {
                // [] Need to add it to the already staked amount!!!
                // In line 108 the rndStakedAmount return values must be added to an array
                IVestingControllerERC721(VC_TOKEN).modifyStakedAmount(
                    tokenIds[0],
                    vc_amount
                );
            }
        }

        // SM mints sRND tokens for the user
        mint(_msgSender(), amount);
        emit Staked(amount);
    }

    function cooldown() public {
        require(
            balanceOf(_msgSender()) > 0,
            "SM: No staked balance to cooldown"
        );
        stakerCooldown[_msgSender()] = block.timestamp;
        emit CooldownStaked(_msgSender());
    }

    // Redeems users staked tokens after cooldown period ended and still within unstake window
    // If the user is a vesting investor then his vested tokens will be prioritized for redemption
    function redeem(address recipient, uint256 amount) public {
        require(amount > 0, "SM: Redeem amount cannot be zero");
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
        uint256 balanceOfStaker = balanceOf(_msgSender());
        uint256 vcBalanceOfStaker = onBehalf[_msgSender()][address(VC_TOKEN)];
        uint256 ownBalanceOfStaker = onBehalf[_msgSender()][_msgSender()];

        // [] optionally added - can be removed, main use for testing
        require(
            balanceOfStaker == vcBalanceOfStaker + ownBalanceOfStaker,
            "SM: Unequal tokens minted and onBehalf amounts"
        );

        // If user has only RND
        if (amount <= ownBalanceOfStaker) {
            onBehalf[_msgSender()][_msgSender()] -= amount;
        } else {
            // If user also has vesting tokens
            // Null his own tokens
            balanceOfStaker -= ownBalanceOfStaker;
            onBehalf[_msgSender()][_msgSender()] = 0;
            // Substract unstaked amount from VC staked amounts
            // by iterating over his investment tokens from oldest to newest
            uint256 VCbalance = IVestingControllerERC721(VC_TOKEN).balanceOf(
                _msgSender()
            );
            uint256[] memory tokenIds;
            uint256[] memory stakedOnTokenId;
            uint256[] memory toUnstakedOnTokenId;
            // Iterate over investments
            for (uint256 i = 0; i <= VCbalance; i++) {
                uint256 tokenId = IVestingControllerERC721(VC_TOKEN)
                    .tokenOfOwnerByIndex(_msgSender(), i);
                //tokenIds.push(tokenId);
                tokenIds[i] = tokenId;
                (
                    uint256 rndTokenAmount,
                    uint256 rndClaimedAmount,
                    uint256 vestingPeriod,
                    uint256 vestingStartTime,
                    uint256 rndStakedAmount
                ) = IVestingControllerERC721(VC_TOKEN).getInvestmentInfo(
                        tokenId
                    );
                stakedOnTokenId[i] = rndStakedAmount;
                delete (rndTokenAmount);
                delete (rndClaimedAmount);
                delete (vestingPeriod);
                delete (vestingStartTime);
            }
            // Iterate over investments and get the required amount to unstake
            for (uint256 i = 0; i <= tokenIds.length; i++) {
                if (vcBalanceOfStaker > stakedOnTokenId[i]) {
                    toUnstakedOnTokenId[i] = vcBalanceOfStaker;
                    vcBalanceOfStaker -= stakedOnTokenId[i];
                } else {
                    toUnstakedOnTokenId[i] = vcBalanceOfStaker;
                    break;
                }
            }
            // Iterate over unstake amount array and call the modifyStakedAmount on VC
            for (uint256 i = 0; i <= toUnstakedOnTokenId.length; i++) {
                // modify staked amount on VC
                IVestingControllerERC721(VC_TOKEN).modifyStakedAmount(
                    tokenIds[i],
                    toUnstakedOnTokenId[i]
                );
                onBehalf[_msgSender()][
                    address(VC_TOKEN)
                ] -= toUnstakedOnTokenId[i];
            }
        }

        // Burn stake tokens and transfer amount to recipient address
        burn(_msgSender(), amount);
        transfer(recipient, amount);
        emit RedeemStaked(_msgSender(), recipient, amount);
    }

    function stakeNew(
        bool vested,
        uint256 tokenId,
        uint256 amount
    ) public {
        if (vested) {
            _stakeOnTokenId(tokenId, amount);
        } else {
            _stakeOnRND(amount);
        }
    }

    function _stakeOnRND(uint256 amount) internal {
        require(amount != 0, "SM: Stake amount cannot be zero");
        // Set increase allowance for SM
        IRandToken(RND_TOKEN).setAllowanceForSM(_msgSender(), amount);
        // Transfer RND from staker to SM
        IRandToken(RND_TOKEN).transferFrom(_msgSender(), address(this), amount);

        // SM registers staked amount in SM storage and VC storage
        // Set onBehalf amounts on SM
        onBehalf[_msgSender()][_msgSender()] += amount;
        // SM mints sRND tokens for the user
        mint(_msgSender(), amount);
        emit Staked(amount);
    }

    function _stakeOnTokenId(uint256 tokenId, uint256 amount) internal {
        require(amount != 0, "SM: Stake amount cannot be zero");
        // Get stakeable amount from VC
        (
            uint256 rndTokenAmount,
            uint256 rndClaimedAmount,
            uint256 vestingPeriod,
            uint256 vestingStartTime,
            uint256 rndStakedAmount
        ) = IVestingControllerERC721(VC_TOKEN).getInvestmentInfo(tokenId);
        delete (vestingPeriod);
        delete (vestingStartTime);
        require(
            rndTokenAmount - rndClaimedAmount - rndStakedAmount >= amount,
            "SM: Not enough stakable amount on VC tokenId"
        );
        // Set allowance on tokens owned by VC
        IVestingControllerERC721(VC_TOKEN).setAllowanceForSM(amount);
        // Transfer RND from VC to SM
        IVestingControllerERC721(VC_TOKEN).transferFrom(
            address(VC_TOKEN),
            address(this),
            amount
        );
        // Set onBehalf amounts
        onBehalf[_msgSender()][address(VC_TOKEN)] += amount;
        // Register staked amount on VC
        IVestingControllerERC721(VC_TOKEN).modifyStakedAmount(
            tokenId,
            rndStakedAmount + amount
        );
        // SM mints sRND tokens for the user
        mint(_msgSender(), amount);
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

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount)
        public
        virtual
        onlyRole(BURNER_ROLE)
    {
        _burn(from, amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        revert("SM: Transfer of staked tokens is prohibited!");
    }

    /// @inheritdoc	ERC20Upgradeable
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
