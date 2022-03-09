require("@nomiclabs/hardhat-etherscan");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, upgrades, network } = require("hardhat");
const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Rand Token with Vesting Controller", function () {

  // Deployment params for initializer
  const RNDdeployParams = {
    _name: "Token ERC20",
    _symbol: "tRND",
    _initialSupply: BigNumber.from(200e6),
    _registry: ""
  };

  const VCdeployParams = {
    _name: "Vesting Controller ERC721",
    _symbol: "tvRND",
    _periodSeconds: 1,
    _registry: ""
  };

  const SMdeployParams = {
    _name: "Safety Module ERC20",
    _symbol: "tsRND",
    _cooldown_seconds: 120, // 604800 7 days
    _unstake_window: 240,
    _registry: ""
  };

  let Token;
  let VestingController;
  let RandToken;
  let RandVC;
  let owner;
  let alice;
  let backend;
  let gotNetwork, chainId, localNode;
  let mint_tx, e_tokenId;

  before(async function () {

    gotNetwork = await ethers.provider.getNetwork();
    chainId = gotNetwork.chainId;
    localNode = 31337; // local default chainId from hardhat.config.js
    console.log('Network: ', gotNetwork.name, chainId);
    numConfirmation = chainId !== localNode ? 1 : 0;
    console.log('Number of confirmations to wait:', numConfirmation);

    if (chainId !== localNode) {
      VCdeployParams._periodSeconds = 5;
    }


    [owner, alice, backend] = await ethers.getSigners();
    console.log(owner.address);
    console.log(alice.address);
    console.log(backend.address);

    Registry = await ethers.getContractFactory("AddressRegistry");
    Token = await ethers.getContractFactory("RandToken");
    VestingController = await ethers.getContractFactory("VestingControllerERC721");
    SafetyModule = await ethers.getContractFactory("SafetyModuleERC20");

    multisig_address = owner.address;
    oz_defender = backend.address;

    RandRegistry = await upgrades.deployProxy(
      Registry,
      [multisig_address],
      { kind: "uups" });
    console.log('Deployed Registry proxy at:', RandRegistry.address);

    await RandRegistry.setNewAddress("MS", multisig_address);
    await RandRegistry.setNewAddress("OZ", oz_defender);

    RNDdeployParams._registry = RandRegistry.address;
    VCdeployParams._registry = RandRegistry.address;
    SMdeployParams._registry = RandRegistry.address;

    RandToken = await upgrades.deployProxy(
      Token,
      Object.values(RNDdeployParams),
      { kind: "uups" });
    console.log('Deployed Token proxy at:', RandToken.address);

    RandVC = await upgrades.deployProxy(
      VestingController,
      Object.values(VCdeployParams),
      { kind: "uups" });
    console.log('Deployed VC proxy at:', RandVC.address);

    RandSM = await upgrades.deployProxy(
      SafetyModule,
      Object.values(SMdeployParams),
      { kind: "uups" });
    console.log('Deployed SM proxy at:', RandSM.address);

    // Wait for confirmations
    if (chainId !== localNode) {
      txRandToken = RandToken.deployTransaction;
      txRandVC = RandVC.deployTransaction;
      txRandSM = RandSM.deployTransaction;
      txRandReg = RandRegistry.deployTransaction;
      await txRandToken.wait(numConfirmation);
      await txRandVC.wait(numConfirmation);
      await txRandSM.wait(numConfirmation);
      await txRandReg.wait(numConfirmation);
    }

    RandRegistryImpl = await upgrades.erc1967.getImplementationAddress(RandRegistry.address);
    console.log('Deployed Registry implementation at:', RandRegistryImpl);
    RandTokenImpl = await upgrades.erc1967.getImplementationAddress(RandToken.address);
    console.log('Deployed Token implementation at:', RandTokenImpl);
    RandVCImpl = await upgrades.erc1967.getImplementationAddress(RandVC.address);
    console.log('Deployed VC implementation at:', RandVCImpl);
    RandSMImpl = await upgrades.erc1967.getImplementationAddress(RandSM.address);
    console.log('Deployed SM implementation at:', RandSMImpl);

    // Set roles and addresses
    await RandRegistry.setNewAddress("RND", RandToken.address);
    await RandRegistry.setNewAddress("VC", RandVC.address);
    await RandRegistry.setNewAddress("SM", RandSM.address);

  });

  describe("Deployment of RND-ERC20 and VC-ERC721", function () {
    it("Setting and checking owners of RND & VC", async function () {
      MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
      expect(await RandToken.hasRole(MINTER_ROLE, owner.address));
      expect(await RandVC.hasRole(MINTER_ROLE, owner.address));
    });
  });

  describe("RND ERC20 functions", function () {
    it("Checking name, symbol and supply", async function () {
      expect(await RandToken.name()).to.equal(RNDdeployParams._name);
      expect(await RandToken.symbol()).to.equal(RNDdeployParams._symbol);
      const ownerBalance = await RandToken.balanceOf(owner.address);
      expect(await RandToken.totalSupply()).to.equal(ownerBalance);
    });
    it("Minting tokens", async function () {
      // Should mint with owner
      const amount = BigNumber.from("1").pow(18);
      const ownerBalanceBefore = await RandToken.balanceOf(owner.address);
      tx = await RandToken.mint(owner.address, amount);
      await tx.wait(numConfirmation);
      const ownerBalanceAfter = await RandToken.balanceOf(owner.address);
      expect(ownerBalanceBefore.add(amount)).to.equal(ownerBalanceAfter);
      // Should not mint from alice
      if (chainId !== localNode) {
        await RandToken.connect(alice).mint(alice.address, amount).catch(function (error) {
          expect(error.code).to.be.equal('UNPREDICTABLE_GAS_LIMIT');
        });
      } else {
        await expectRevert.unspecified(RandToken.connect(alice).mint(alice.address, amount));
      }

    });
    it("Burning tokens", async function () {
      // Should burn with owner
      const amount = BigNumber.from("1").pow(18);
      const ownerBalanceBefore = await RandToken.balanceOf(owner.address);
      tx = await RandToken.increaseAllowance(owner.address, amount);
      await tx.wait(numConfirmation);
      tx = await RandToken.burnFrom(owner.address, amount);
      await tx.wait(numConfirmation);
      const ownerBalanceAfter = await RandToken.balanceOf(owner.address);
      expect(ownerBalanceBefore.sub(amount)).to.equal(ownerBalanceAfter);
      // Should not burn from owner by alice
      if (chainId !== localNode) {
        await RandToken.connect(alice).burnFrom(owner.address, amount).catch(function (error) {
          expect(error.code).to.be.equal('UNPREDICTABLE_GAS_LIMIT');
        });
      } else {
        await expectRevert.unspecified(RandToken.connect(alice).burnFrom(owner.address, amount));
      }

    });
    it("Transferring tokens", async function () {
      const amount = BigNumber.from("1").pow(18);
      const ownerBalanceBefore = await RandToken.balanceOf(owner.address);
      const aliceBalanceBefore = await RandToken.balanceOf(alice.address);
      tx = await RandToken.transfer(alice.address, amount);
      await tx.wait(numConfirmation);
      const ownerBalanceAfter = await RandToken.balanceOf(owner.address);
      expect(ownerBalanceBefore.sub(amount)).to.equal(ownerBalanceAfter);
      expect(aliceBalanceBefore.add(amount)).to.equal(amount);

    });
    it("Pausing contract", async function () {
      tx = await RandToken.pause();
      await tx.wait(numConfirmation);
      const amount = BigNumber.from("1").pow(18);
      if (chainId !== localNode) {
        await RandToken.transfer(alice.address, amount).catch(function (error) {
          expect(error.code).to.be.equal('UNPREDICTABLE_GAS_LIMIT');
        });
      } else {
        await expectRevert.unspecified(RandToken.transfer(alice.address, amount));
      }
      tx = await RandToken.unpause();
      await tx.wait(numConfirmation);
      expect(await RandToken.transfer(alice.address, amount));
    });
  });

  describe("VC ERC721 functions", function () {
    before(async function () {

      // solidity timestamp
      last_block = await ethers.provider.getBlock();
      created_ts = last_block.timestamp;
      //created_ts = Math.floor(Date.now() / 1000);

      recipient = alice.address;
      rndTokenAmount = ethers.utils.parseEther('100');
      vestingPeriod = BigNumber.from("10");
      vestingStartTime = BigNumber.from(created_ts);
      cliffPeriod = BigNumber.from("1");
      claimablePerPeriod = rndTokenAmount.div(vestingPeriod);

      // Add allowance for VC to fetch tokens in claim
      tx = await RandToken.increaseAllowance(RandVC.address, rndTokenAmount.mul(2));
      await tx.wait(numConfirmation);
      // Minting a sample investment token

      mint_tx = await RandVC.mintNewInvestment(
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
      );
      await mint_tx.wait(numConfirmation);
      mint_tx = await RandVC.mintNewInvestment(
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
      );
      const rc = await mint_tx.wait(numConfirmation);
      const event = rc.events.find(event => event.event === 'NewInvestmentTokenMinted');
      e_tokenId = event.args.tokenId;
      console.log('Minted token:', e_tokenId);
    });
    it("Checking name, symbol and supply", async function () {
      expect(await RandVC.name()).to.equal(VCdeployParams._name);
      expect(await RandVC.symbol()).to.equal(VCdeployParams._symbol);
      expect(await RandVC.totalSupply()).to.equal(2);
    });
    it("Setting and checking tokenURI", async function () {
      const tokenURI = "http://rand.network/token/";
      tx = await RandVC.setBaseURI(tokenURI);
      await tx.wait(numConfirmation);
      const expectedURI = tokenURI + e_tokenId;
      console.log(expectedURI);
      expect(await RandVC.tokenURI(e_tokenId)).to.equal(expectedURI);
    });
    it("Should not be able to burn tokens", async function () {
      if (chainId !== localNode) {
        await RandVC.connect(alice).burn(e_tokenId).catch(function (error) {
          expect(error.code).to.be.equal('UNPREDICTABLE_GAS_LIMIT');
        });
      } else {
        await expectRevert.unspecified(RandVC.connect(alice).burn(e_tokenId));
      }
    });
    it("Checking claimable tokens", async function () {
      claimable = rndTokenAmount.div(vestingPeriod).mul(4);
      expect(await RandVC.connect(alice.address).getClaimableTokens(e_tokenId)).to.be.equal(claimable);
    });
    it("Get full investment info", async function () {
      await RandVC.connect(alice.address).getInvestmentInfo(e_tokenId).then(function (res) {
        var var1 = res[0];
        var var2 = res[1];
        var var3 = res[2];
        var var4 = res[3];
        expect(var1).to.be.equal(rndTokenAmount);
        expect(var2).to.be.equal(0); //rndClaimedAmount
        expect(var3).to.be.equal(vestingPeriod);
        expect(var4).to.be.equal(vestingStartTime.add(cliffPeriod));
      });
    });
    it("Claiming vested tokens by user and backend", async function () {

      // Logic to differentiate local testing and testnet
      // Local node
      if (chainId == localNode) {
        // Mine an amount of blocks to increase block.timestamp
        period = vestingPeriod / 2;
        periods = cliffPeriod.add(period);
        for (let i = 1; i <= periods; i++) {
          await ethers.provider.send('evm_mine');

        }
        // Added 3 due to previous transactions mined since than 
        periods_mined = periods.add(4);
      }
      // Testnet
      else {
        // Wait an fetch new block's timestamp so claimable amount increases
        currentBlockNumber = await ethers.provider.getBlockNumber();
        currentBlockTimestamp = await ethers.provider.getBlock();
        currentBlockTimestamp = currentBlockTimestamp.timestamp;
        newBlockTimestamp = 0;
        while (currentBlockTimestamp > newBlockTimestamp) {
          sleep(5000);
          newBlockTimestamp = await ethers.provider.getBlock();
          newBlockTimestamp = newBlockTimestamp.timestamp;
        }
        currentBlockNumber = await ethers.provider.getBlockNumber();
        currentBlockTimestamp = await ethers.provider.getBlock();
        periods_mined = currentBlockTimestamp.timestamp;
        periods_mined -= created_ts;
        periods_mined = BigNumber.from(periods_mined).div(5);
      }

      // Check balances
      claimableAmount = await RandVC.connect(alice.address).getClaimableTokens(tx.value);
      claimableAmountHalf = claimableAmount.div(2);
      const aliceBalanceBefore = await RandToken.balanceOf(alice.address);
      expect(claimableAmount).to.be.equal(claimablePerPeriod.mul(periods_mined));
      // Claim half by owner
      tx = await RandVC.connect(alice).claimTokens(tx.value, claimableAmountHalf);
      await tx.wait(numConfirmation);
      aliceBalanceAfter = await RandToken.balanceOf(alice.address);
      expect(aliceBalanceBefore.add(claimableAmountHalf) == aliceBalanceAfter);
      // Claim other half by backend
      tx = await RandVC.connect(backend).claimTokens(tx.value, claimableAmountHalf);
      await tx.wait(numConfirmation);
      aliceBalanceAfter = await RandToken.balanceOf(alice.address);
      expect(aliceBalanceBefore.add(claimableAmountHalf) == aliceBalanceAfter);
    });
    it("Claiming vested tokens by backend", async function () {
      const aliceBalanceBefore = await RandToken.balanceOf(alice.address);
      claimableAmount = await RandVC.connect(alice.address).getClaimableTokens(e_tokenId);
      tx = await RandVC.connect(backend).claimTokens(e_tokenId, claimableAmount);
      await tx.wait(numConfirmation);
      aliceBalanceAfter = await RandToken.balanceOf(alice.address);
      expect(aliceBalanceBefore.add(claimableAmount) == aliceBalanceAfter);
    });
  });

  describe("SM functionality", function () {
    it("Staking funds of RND", async function () {
    });
    it("Staking funds of VC RND", async function () {
    });
    it("Redeeming tokens of RND", async function () {
    });
    it("Redeeming tokens of VC RND", async function () {
    });
  });

  // describe("Upgrading deployment of RND-ERC20 and VC-ERC721", function () {
  //   it("Upgrading RND", async function () { });
  //   it("Upgrading VC", async function () { });
  //   it("Upgrading SM", async function () { });
  //   it("Upgrading Registry", async function () { });

  // });

});