const { expect } = require("chai");
const { BigNumber } = require("ethers")
const { ethers, upgrades } = require("hardhat");
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

  const RNDdeployParams = {
    _name: "Rand Token ERC20",
    _symbol: "RND",
    _initialSupply: BigNumber.from(200e6)
  }

  const VCdeployParams = {
    _name: "Rand Vesting Controller ERC721",
    _symbol: "vRND",
    _rndTokenContract: 0, //RandToken.address,
    _smTokenContract: 0, //RandToken.address,
    _periodSeconds: 1,
    _multiSigAddress: 0,
    _backendAddress: 0
  }

  let Token;
  let VestingController;
  let RandToken;
  let RandVC;
  let proxyAdmin;
  let owner;
  let alice;
  let backend;
  let network, chainId, localNode

  beforeEach(async function () {

    network = await ethers.provider.getNetwork();
    chainId = network.chainId;
    localNode = 31337; // local default chainId from hardhat.config.js

    [owner, proxyAdmin, alice, backend] = await ethers.getSigners();

    Token = await ethers.getContractFactory("RandToken");
    VestingController = await ethers.getContractFactory("VestingControllerERC721");

    RandToken = await upgrades.deployProxy(
      Token,
      Object.values(RNDdeployParams),
      { kind: 'transparent' });

    VCdeployParams._rndTokenContract = RandToken.address;
    VCdeployParams._smTokenContract = RandToken.address;
    VCdeployParams._multiSigAddress = owner.address;
    VCdeployParams._backendAddress = backend.address;

    RandVC = await upgrades.deployProxy(
      VestingController,
      Object.values(VCdeployParams),
      { kind: 'transparent' });

    await upgrades.admin.changeProxyAdmin(RandVC.address, proxyAdmin.address);

  });

  // You can nest describe calls to create subsections.
  describe("Deployment of RND-ERC20 and VC-ERC721", function () {
    it("Setting and checking owners of RND & VC", async function () {
      MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
      expect(await RandToken.hasRole(MINTER_ROLE, owner.address));
    });
    it("Upgrading VC", async function () { });
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
      await RandToken.mint(owner.address, amount);
      const ownerBalanceAfter = await RandToken.balanceOf(owner.address);
      expect(ownerBalanceBefore.add(amount)).to.equal(ownerBalanceAfter);
      // Should not mint from alice
      await expectRevert.unspecified(RandToken.connect(alice).mint(alice.address, amount));
    });
    it("Burning tokens", async function () {
      // Should burn with owner
      const amount = BigNumber.from("1").pow(18);
      const ownerBalanceBefore = await RandToken.balanceOf(owner.address);
      await RandToken.increaseAllowance(owner.address, amount);
      await RandToken.burnFrom(owner.address, amount);
      //await RandToken.burn(amount);
      const ownerBalanceAfter = await RandToken.balanceOf(owner.address);
      expect(ownerBalanceBefore.sub(amount)).to.equal(ownerBalanceAfter);
      // Should not burn from owner by alice 
      await expectRevert.unspecified(RandToken.connect(alice).burnFrom(owner.address, amount));
    });
    it("Transferring tokens", async function () {
      const amount = BigNumber.from("1").pow(18);
      const ownerBalanceBefore = await RandToken.balanceOf(owner.address);
      const aliceBalanceBefore = await RandToken.balanceOf(alice.address);
      await RandToken.transfer(alice.address, amount);
      const ownerBalanceAfter = await RandToken.balanceOf(owner.address);
      expect(ownerBalanceBefore.sub(amount)).to.equal(ownerBalanceAfter);
      expect(aliceBalanceBefore.add(amount)).to.equal(amount);

    });
    it("Pausing contract", async function () {
      await RandToken.pause();
      const amount = BigNumber.from("1").pow(18);
      await expectRevert.unspecified(RandToken.transfer(alice.address, amount));
      await RandToken.unpause();
      expect(RandToken.transfer(alice.address, amount));
    });
  });

  describe("VC ERC721 functions", function () {
    beforeEach(async function () {

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
      await RandToken.increaseAllowance(RandVC.address, rndTokenAmount);
      tx = await RandVC.mintNewInvestment(
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod);
    })
    it("Checking name, symbol and supply", async function () {
      expect(await RandVC.name()).to.equal(VCdeployParams._name);
      expect(await RandVC.symbol()).to.equal(VCdeployParams._symbol);
      expect(await RandVC.totalSupply()).to.equal(1);
    });
    it("Setting and checking tokenURI", async function () {
      const tokenURI = "http://rand.network/token/";
      await RandVC.setBaseURI(tokenURI);
      const expectedURI = tokenURI + tx.value;
      expect(await RandVC.tokenURI(0)).to.equal(expectedURI);
    });
    it("Should not be able to burn tokens", async function () {
      await expectRevert.unspecified(RandVC.connect(alice).burn(tx.value));
    });
    it("Checking claimable tokens", async function () {
      claimable = rndTokenAmount.div(vestingPeriod);
      expect(await RandVC.getClaimableTokens(tx.value)).to.be.equal(claimable);
    });
    it("Get full investment info", async function () {
      await RandVC.getInvestmentInfo(tx.value).then(function (res) {
        var var1 = res[0];
        var var2 = res[1];
        var var3 = res[2];
        var var4 = res[3];
        expect(var1).to.be.equal(rndTokenAmount);
        expect(var2).to.be.equal(0); //rndClaimedAmount
        expect(var3).to.be.equal(vestingPeriod);
        expect(var4).to.be.equal(vestingStartTime.add(cliffPeriod));
      })
    });
    it("Claiming vested tokens by user and backend", async function () {

      // Logic to differentiate local testing and testnet
      // Local node
      if (chainId == localNode) {
        // Mine an amount of blocks to increase block.timestamp
        period = 3;
        periods = cliffPeriod.add(period);
        for (let i = 1; i <= periods; i++) {
          await ethers.provider.send('evm_mine');
        }

        claimableAmount = await RandVC.getClaimableTokens(tx.value);
        // claimablePerPeriod + 1 for getClaimableTokens and multiply by periods mined above
        periods_mined = periods.add(1);

      }
      // Testnet
      // else {
      //   // Wait an fetch new block's timestamp so claimable amount increases
      //   currentBlockNumber = await ethers.provider.getBlockNumber();
      //   currentBlockTimestamp = await ethers.provider.getBlock();
      //   currentBlockTimestamp = currentBlockTimestamp.timestamp;
      //   newBlockTimestamp = 0;
      //   while (currentBlockTimestamp > newBlockTimestamp) {
      //     sleep(5000);
      //     newBlockTimestamp = await ethers.provider.getBlock();
      //     newBlockTimestamp = newBlockTimestamp.timestamp;
      //   }
      //   claimableAmount = await RandVC.getClaimableTokens(tx.value);
      // }

      // Check balances
      claimableAmount = await RandVC.getClaimableTokens(tx.value);
      claimableAmountHalf = claimableAmount.div(2);
      const aliceBalanceBefore = await RandToken.balanceOf(alice.address);
      expect(claimableAmount).to.be.equal(claimablePerPeriod.mul(periods_mined));
      // Claim half by owner
      await RandVC.connect(alice).claimTokens(tx.value, alice.address, claimableAmountHalf);
      aliceBalanceAfter = await RandToken.balanceOf(alice.address);
      expect(aliceBalanceBefore.add(claimableAmountHalf) == aliceBalanceAfter);
      // Claim other half by backend
      await RandVC.connect(backend).claimTokens(tx.value, alice.address, claimableAmountHalf);
      aliceBalanceAfter = await RandToken.balanceOf(alice.address);
      expect(aliceBalanceBefore.add(claimableAmountHalf) == aliceBalanceAfter);
    });
    //it("Claiming vested tokens by backend", async function () { });
  });

  // describe("VC interaction with SM", function () {
  //   it("Checking token balance before staking", async function () { });
  //   it("Setting allowance for SM in amount of stake", async function () { });
  //   it("Registering staked amount for investment", async function () { });
  // });

});