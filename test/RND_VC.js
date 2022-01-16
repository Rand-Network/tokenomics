const { expect } = require("chai");
const { BigNumber } = require("ethers")
const { ethers, upgrades } = require("hardhat");
const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

describe("Rand Token with Vesting Controller", function () {

  let RNDdeployParams = {
    _name: "Rand Token ERC20",
    _symbol: "RND"
  }

  let VCdeployParams = {
    _name: "Rand Vesting Controller ERC721",
    _symbol: "vRND",
    _rndTokenContract: 0, //RandToken.address,
    _smTokenContract: 0, //RandToken.address,
    _periodSeconds: 1
  }

  let Token;
  let VestingController;
  let RandToken;
  let RandVC;
  let proxyAdmin;
  let owner;
  let alice;
  let bob;
  let charlie;

  beforeEach(async function () {

    [owner, proxyAdmin, alice, bob, charlie] = await ethers.getSigners();

    Token = await ethers.getContractFactory("RandToken");
    VestingController = await ethers.getContractFactory("VestingControllerERC721");

    RandToken = await upgrades.deployProxy(
      Token,
      Object.values(RNDdeployParams),
      { kind: 'transparent' });

    VCdeployParams._rndTokenContract = RandToken.address;
    VCdeployParams._smTokenContract = RandToken.address;
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
    it("Checking name, symbol and supply", async function () {
      expect(await RandVC.name()).to.equal(VCdeployParams._name);
      expect(await RandVC.symbol()).to.equal(VCdeployParams._symbol);
      expect(await RandVC.totalSupply()).to.equal(0);
    });
    it("Setting and checking tokenURI", async function () {
      const tokenURI = "http://rand.network/token/";
      const recipient = alice.address;
      const rndTokenAmount = BigNumber.from("1").pow(18);
      const vestingPeriod = 1;
      const vestingStartTime = 1;
      const cliffPeriod = 0;

      await RandVC.setBaseURI(tokenURI);
      await RandVC.mintNewInvestment(
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod);
      expect(await RandVC.tokenURI(0)).to.equal(tokenURI + '0');
    });
    it("Should not be able to burn tokens", async function () { });
  });

  describe("Registering vesting investment on VC", function () {
    it("Minting new investment token", async function () { });
    it("Checking claimable tokens", async function () { });
    it("Claiming vested tokens by user", async function () { });
    it("Claiming vested tokens by backend", async function () { });
  });

  describe("VC interaction with SM", function () {
    it("Checking token balance before staking", async function () { });
    it("Setting allowance for SM in amount of stake", async function () { });
    it("Registering staked amount for investment", async function () { });
  });

});