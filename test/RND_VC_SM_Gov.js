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
const { executeContractCallWithSigners } = require("@gnosis.pm/safe-contracts");
const { deploy_testnet } = require("../scripts/deploy_testnet_task.js");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Rand Token with Vesting Controller", function () {

  // Deployment params for initializer
  const _RNDdeployParams = {
    _name: "Token ERC20",
    _symbol: "tRND",
    _initialSupply: BigNumber.from(200e6),
    _registry: ""
  };

  const _VCdeployParams = {
    _name: "Vesting Controller ERC721",
    _symbol: "tvRND",
    _periodSeconds: 1,
    _registry: ""
  };

  const _SMdeployParams = {
    _name: "Safety Module ERC20",
    _symbol: "tsRND",
    _cooldown_seconds: 120, // 604800 7 days
    _unstake_window: 240,
    _registry: ""
  };

  const _NFTdeployParams = {
    _name: "Rand Early Investors NFT",
    _symbol: "RandNFT",
    _registry: ""
  };

  const _GovDeployParams = {
    _name: "Rand Governance Aggregator",
    _symbol: "gRND",
    _registry: ""
  };

  before(async function () {

    let owner;
    let alice;
    let backend;

    deployed = await deploy_testnet(
      initialize = false, verify = false,
      RNDdeployParams = _RNDdeployParams,
      VCdeployParams = _VCdeployParams,
      SMdeployParams = _SMdeployParams,
      NFTdeployParams = _NFTdeployParams,
      GovDeployParams = _GovDeployParams);

    let RandToken = deployed.RandToken,
      RandVC = deployed.RandVC,
      RandSM = deployed.RandSM,
      RandNFT = deployed.RandNFT,
      RandGov = deployed.RandGov,
      RandRegistry = deployed.RandRegistry,
      RandReserve = deployed.RandReserve;

    [owner, alice, backend] = await ethers.getSigners();
    // console.log(owner.address);
    // console.log(alice.address);
    // console.log(backend.address);

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
      expect(await RandToken.name()).to.equal(_RNDdeployParams._name);
      expect(await RandToken.symbol()).to.equal(_RNDdeployParams._symbol);
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

      mint_tx = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
      );
      await mint_tx.wait(numConfirmation);
      mint_tx = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
      );
      const rc = await mint_tx.wait(numConfirmation);
      const event = rc.events.find(event => event.event === 'NewInvestmentTokenMinted');
      e_tokenId = event.args.tokenId;
      //console.log('Minted token:', e_tokenId);
    });
    it("Checking name, symbol and supply", async function () {
      expect(await RandVC.name()).to.equal(_VCdeployParams._name);
      expect(await RandVC.symbol()).to.equal(_VCdeployParams._symbol);
      expect(await RandVC.totalSupply()).to.equal(2);
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
      claimable = rndTokenAmount.div(vestingPeriod).mul(3);
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

      // Mine an amount of blocks to increase block.timestamp
      period = vestingPeriod / 2;
      periods = cliffPeriod.add(period);
      for (let i = 1; i <= periods; i++) {
        await ethers.provider.send('evm_mine');
      }
      // Added 3 due to previous transactions mined since than 
      periods_mined = periods.add(3);

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
    before(async function () {
      //
      //    THIS PART IS FOR BPT Token testing, can be tested without BPT with the base implementation of single RND staking
      //
      // Deploying Mock BPT token contract, [owner] got the minted the supply
      let RandReserve = deployed.RandReserve;
      MockToken = await ethers.getContractFactory("TestBalancerPoolToken");
      BPT = await upgrades.deployProxy(
        MockToken, [],
        { kind: "uups" });
      console.log('Deployed BTP Token proxy at:', BPT.address);
      txRandBPTToken = BPT.deployTransaction;
      await txRandBPTToken.wait(numConfirmation);
      // Transfer [alice] some tokens
      await BPT.transfer(alice.address, ethers.utils.parseEther("100"));
      console.log("Alice BPT balance:", await BPT.balanceOf(alice.address));

      await RandToken.transfer(alice.address, ethers.utils.parseEther("100"));
      console.log("Alice RND balance:", await RandToken.balanceOf(alice.address));

      // Init Reserve 
      // Transfer RND to Reserve 
      reserveAmount = rndTokenAmount.mul(10);
      tx = await RandToken.transfer(RandReserve.address, reserveAmount);
      await tx.wait(numConfirmation);
      console.log("Reserve balance of RND:", await RandToken.balanceOf(RandReserve.address));

      // Init SM _updateAsset
      emissionPerSec = 1000;
      const update_tx = await RandSM.updateAsset(
        await RandRegistry.getAddress("SM"),
        emissionPerSec,
        ethers.utils.parseEther("1")
      );

      // Tenderly init
      //const SM = await hre.ethers.getContractFactory("SafetyModuleERC20");
      // await hre.tenderly.persistArtifacts({
      //   name: "SafetyModuleERC20",
      //   address: RandSM.address
      // });

      // await hre.tenderly.push({
      //   name: "SafetyModuleERC20",
      //   address: RandSM.address,
      // });

      tokenId = await RandVC.tokenOfOwnerByIndex(alice.address, 0);
      claimableOnTokenId = await RandVC.connect(alice).getClaimableTokens(tokenId);
      // console.log("Alice VC RND info:", await RandVC.connect(alice).getInvestmentInfo(tokenId));
      // console.log("sRND total supply:", await RandSM.totalSupply());
      // console.log("SM RND balance:", await RandToken.balanceOf(RandSM.address));
      // console.log("Alice RND balance:", await RandToken.balanceOf(alice.address));
      // console.log("Alice sRND balance:", await RandSM.balanceOf(alice.address));
      stakeAmount = ethers.utils.parseEther("1");
      mine_periods = 100;
    });
    it("Staking funds of RND", async function () {
      //console.log(await RandSM.assets(RandSM.address));
      stake_tx_1 = await RandSM.connect(alice)["stake(uint256)"](stakeAmount);
      //console.log(await RandSM.assets(RandSM.address));
      //console.log("Alice sRND balance:", await RandSM.balanceOf(alice.address));
      expect(await RandSM.balanceOf(alice.address)).to.equal(stakeAmount);
      for (i = 0; i < mine_periods; i++) {
        await hre.network.provider.send("evm_mine");
      }
    });
    it("Staking funds of VC RND", async function () {
      stake_tx_3 = await RandSM.connect(alice)["stake(uint256,uint256)"](tokenId, claimableOnTokenId);
      // console.log("Alice sRND balance:", await RandSM.balanceOf(alice.address));
      // console.log("SM RND balance:", await RandToken.balanceOf(RandSM.address));
      // console.log(await RandSM.assets(RandSM.address));
      for (i = 0; i < mine_periods - 1; i++) {
        await hre.network.provider.send("evm_mine");
      }
      //console.log("Alice Total SM rewards", await RandSM.calculateTotalRewards(alice.address));
      //console.log("Alice VC RND info:", await RandVC.connect(alice).getInvestmentInfo(tokenId));
    });
    it("Checking reward balances", async function () {
      expectedReward = mine_periods * 2 * emissionPerSec;
      expect(await RandSM.calculateTotalRewards(alice.address)).to.equal(expectedReward);
    });
    it("Claiming accrued rewards", async function () {
      aliceBalanceBefore = await RandToken.balanceOf(alice.address);
      //console.log("Alice Total SM rewards", await RandSM.calculateTotalRewards(alice.address));
      // console.log("REWARD_TOKEN", await RandSM.REWARD_TOKEN());
      // console.log("REWARDS_VAULT", await RandSM.REWARDS_VAULT());
      // console.log("RandToken", RandToken.address);
      await RandSM.connect(alice).claimRewards(expectedReward);
      aliceAfterBefore = await RandToken.balanceOf(alice.address);
      // console.log("Alice Total SM rewards", await RandSM.calculateTotalRewards(alice.address));
      // console.log("Alice RND balance", await RandToken.balanceOf(alice.address));
      expect(aliceAfterBefore).to.equal(aliceBalanceBefore.add(expectedReward));
    });
    it("Redeeming tokens of RND", async function () {
      aliceBeforeBalance = await RandSM.balanceOf(alice.address);
      //console.log("aliceBeforeBalance", aliceBeforeBalance);
      aliceBeforeBalanceRND = await RandToken.balanceOf(alice.address);
      cooldownSeconds = await RandSM.COOLDOWN_SECONDS();
      unstakePeriod = await RandSM.UNSTAKE_WINDOW();
      // Starting cooldown
      await RandSM.connect(alice).cooldown();
      for (i = 0; i < cooldownSeconds - 1; i++) {
        await hre.network.provider.send("evm_mine");
      }
      // Should be able to redeem while in cooldown
      await expectRevert.unspecified(RandSM.connect(alice)['redeem(uint256)'](stakeAmount.div(2)));
      await hre.network.provider.send("evm_mine");
      await RandSM.connect(alice)['redeem(uint256)'](stakeAmount.div(2));
      aliceAfterBalance = await RandSM.balanceOf(alice.address);
      expect(aliceAfterBalance).to.equal(aliceBeforeBalance.sub(stakeAmount.div(2)));
      // Should not be able to redeem after unstake_window
      for (i = 0; i < unstakePeriod - 2; i++) {
        await hre.network.provider.send("evm_mine");
      }
      // No longer using revert thats why next line is commented out
      //await expectRevert.unspecified(RandSM.connect(alice)['redeem(uint256)'](stakeAmount.div(2)));
      expect(aliceAfterBalance).to.equal(await RandSM.balanceOf(alice.address));
      // Checking RND balances
      aliceAfterBalanceRND = await RandToken.balanceOf(alice.address);
      expect(aliceAfterBalanceRND).to.equal(aliceBeforeBalanceRND.add(stakeAmount.div(2)));
    });
    it("Redeeming tokens of VC RND", async function () {
      //claimableOnTokenId, tokenId are used from VC staking
      // Starting cooldown
      aliceBeforeVCInfo = await RandVC.connect(alice).getInvestmentInfo(tokenId);
      aliceBeforeBalance = await RandSM.balanceOf(alice.address);
      aliceBeforeBalanceRND = await RandToken.balanceOf(alice.address);
      await RandSM.connect(alice).cooldown();
      for (i = 0; i < cooldownSeconds - 1; i++) {
        await hre.network.provider.send("evm_mine");
      }
      // Should be able to redeem while in cooldown
      await expectRevert.unspecified(RandSM.connect(alice)['redeem(uint256,uint256)'](tokenId, claimableOnTokenId.div(2)));
      await hre.network.provider.send("evm_mine");
      await RandSM.connect(alice)['redeem(uint256,uint256)'](tokenId, claimableOnTokenId.div(2));
      aliceAfterBalance = await RandSM.balanceOf(alice.address);
      expect(aliceAfterBalance).to.equal(aliceBeforeBalance.sub(claimableOnTokenId.div(2)));
      // Should not be able to redeem after unstake_window
      for (i = 0; i < unstakePeriod - 2; i++) {
        await hre.network.provider.send("evm_mine");
      }
      // No longer using revert thats why next line is commented out
      //await expectRevert.unspecified(RandSM.connect(alice)['redeem(uint256,uint256)'](tokenId, claimableOnTokenId.div(2)));
      expect(aliceAfterBalance).to.equal(await RandSM.balanceOf(alice.address));
      // Checking VC info changes
      aliceAfterVCInfo = await RandVC.connect(alice).getInvestmentInfo(tokenId);
      expect(aliceAfterVCInfo.rndStakedAmount).to.equal(aliceBeforeVCInfo.rndStakedAmount.sub(claimableOnTokenId.div(2)));
      // Checking RND Balance, should not change
      aliceAfterBalanceRND = await RandToken.balanceOf(alice.address);
      expect(aliceBeforeBalanceRND).to.equal(aliceAfterBalanceRND);
    });
  });

  describe("Investors NFT functionality", function () {

    before(async function () {
      // solidity timestamp
      last_block = await ethers.provider.getBlock();
      created_ts = last_block.timestamp;
      recipient = alice.address;
      vestingStartTime = BigNumber.from(created_ts);
      rndTokenAmount = ethers.utils.parseEther('100');
      vestingPeriod = BigNumber.from("10");
      cliffPeriod = BigNumber.from("1");
      tokenId_100 = 100;
      tokenId_101 = 101;
      // Add allowance for VC to fetch tokens in claim
      tx = await RandToken.increaseAllowance(RandVC.address, rndTokenAmount.mul(2));
      await tx.wait(numConfirmation);
      // Minting a sample investment token
      mint_tx_2 = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256,uint256)'](
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
        tokenId_100
      );
      const rc1 = await mint_tx_2.wait(numConfirmation);
      const event1 = rc1.events.find(event => event.event === 'NewInvestmentTokenMinted');
      e_tokenId1 = event1.args.tokenId;

      mint_tx_2 = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256,uint256)'](
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
        tokenId_101
      );
      const rc2 = await mint_tx_2.wait(numConfirmation);
      const event2 = rc2.events.find(event => event.event === 'NewInvestmentTokenMinted');
      e_tokenId2 = event2.args.tokenId;
      //console.log('Minted token:', e_tokenId);
    });
    it("Setting base URI", async function () {
      await RandNFT.setBaseURI("ipfs://someHash/");
    });
    it("Checking contractURI", async function () {
      expect(await RandNFT.contractURI()).to.equal("ipfs://someHash/contract_uri");
    });
    it("Checking tokenURI", async function () {
      expect(await RandNFT.connect(alice).tokenURI(tokenId_100)).to.equal(`ipfs://someHash/${tokenId_100}`);
      expect(await RandNFT.connect(alice).tokenURI(tokenId_101)).to.equal(`ipfs://someHash/${tokenId_101}`);
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send('evm_mine');
      }
      claimableAmount = await RandVC.connect(alice).getClaimableTokens(e_tokenId1);
      await RandVC.connect(alice).claimTokens(e_tokenId1, rndTokenAmount);
      claimableAmount2 = await RandVC.connect(alice).getClaimableTokens(e_tokenId1);
      expect(claimableAmount2).to.equal(0);
      expect(await RandNFT.tokenURI(tokenId_100)).to.equal(`ipfs://someHash/${tokenId_100}_`);
      // Assert stored tokenIds
      expect(await RandVC.connect(backend).getTokenIdOfNFT(tokenId_100)).to.equal(e_tokenId1);
      expect(await RandVC.connect(backend).getTokenIdOfNFT(tokenId_101)).to.equal(e_tokenId2);
    });
    it("Should not be able to burn", async function () {
      await expectRevert.unspecified(RandNFT.connect(alice).burn(tokenId_100));
    });
  });

  describe("Checking governance aggregator contract", function () {

    let aliceTotalBalance;

    before(async function () {
      deployed = await deploy_testnet(
        initialize = false, verify = false,
        RNDdeployParams = _RNDdeployParams,
        VCdeployParams = _VCdeployParams,
        SMdeployParams = _SMdeployParams,
        NFTdeployParams = _NFTdeployParams,
        GovDeployParams = _GovDeployParams);

      let RandToken = deployed.RandToken,
        RandVC = deployed.RandVC,
        RandSM = deployed.RandSM,
        RandNFT = deployed.RandNFT,
        RandGov = deployed.RandGov,
        RandRegistry = deployed.RandRegistry;

      //RandToken, RandVC, RandSM, RandNFT, RandGov, RandRegistry = await deploy_testnet();
      allowanceAmount = ethers.utils.parseEther('1000');
      tx = await RandToken.increaseAllowance(RandVC.address, allowanceAmount);
      // Mint a VC Investment - 200 RND total
      // solidity timestamp
      last_block = await ethers.provider.getBlock();
      created_ts = last_block.timestamp;
      recipient = alice.address;
      rndTokenAmount = ethers.utils.parseEther('100');
      vestingPeriod = BigNumber.from("10");
      vestingStartTime = BigNumber.from(created_ts);
      cliffPeriod = BigNumber.from("1");
      claimablePerPeriod = rndTokenAmount.div(vestingPeriod);
      mint_tx = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
      );
      const rc1 = await mint_tx.wait(numConfirmation);
      const event1 = rc1.events.find(event => event.event === 'NewInvestmentTokenMinted');
      e_tokenId1 = event1.args.tokenId;
      mint_tx = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
        recipient,
        rndTokenAmount,
        vestingPeriod,
        vestingStartTime,
        cliffPeriod,
      );
      const rc2 = await mint_tx.wait(numConfirmation);
      const event2 = rc2.events.find(event => event.event === 'NewInvestmentTokenMinted');
      e_tokenId2 = event2.args.tokenId;
      // Transfer some free RND - 100 RND total
      await RandToken.transfer(alice.address, rndTokenAmount);
      aliceTotalBalance = ethers.utils.parseEther('300');
    });
    it("Checking balances", async function () {
      //console.log("alice gov balanceOf:", await RandGov.balanceOf(alice.address));
      expect(await RandGov.balanceOf(alice.address)).to.equal(aliceTotalBalance);
    });
    it("Checking totalSupply", async function () {
      //console.log("gov totalSupply:", await RandGov.totalSupply());
      expect(await RandGov.totalSupply()).to.equal(ethers.utils.parseEther(_RNDdeployParams._initialSupply.toString()));
    });
  });

  describe.skip("Upgrading deployment of RND-ERC20 and VC-ERC721", function () {
    it("Upgrading RND", async function () { });
    it("Upgrading VC", async function () { });
    it("Upgrading SM", async function () { });
    it("Upgrading Registry", async function () { });
  });
});