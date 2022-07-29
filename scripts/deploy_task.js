require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
const readline = require('readline');
const { BigNumber } = require("ethers");
require("ethers");

//Deployment params for initializer
var _RNDdeployParams = {
  _name: "Token ERC20",
  _symbol: "Token",
  _initialSupply: BigNumber.from(200e6),
  _registry: ""
};

var _VCdeployParams = {
  _name: "Vesting Controller ERC721",
  _symbol: "vToken",
  _periodSeconds: 1,
  _registry: ""
};

var _SMdeployParams = {
  _name: "Safety Module ERC20",
  _symbol: "stToken",
  _cooldown_seconds: 120, // 604800 7 days
  _unstake_window: 240,
  _registry: ""
};

var _NFTdeployParams = {
  _name: "Investors NFT",
  _symbol: "nftToken",
  _registry: ""
};

var _GovDeployParams = {
  _name: "Governance Aggregator",
  _symbol: "govToken",
  _registry: ""
};

async function get_factories() {

  Registry = await ethers.getContractFactory("AddressRegistry");
  Token = await ethers.getContractFactory("RandToken");
  VestingController = await ethers.getContractFactory("VestingControllerERC721");
  SafetyModule = await ethers.getContractFactory("StakedRand");
  InvestorsNFT = await ethers.getContractFactory("InvestorsNFT");
  Governance = await ethers.getContractFactory("Governance");

  return { Registry, Token, VestingController, SafetyModule, InvestorsNFT, Governance };
}

async function get_wallets() {
  [owner, alice, backend] = await ethers.getSigners();
  return { owner, alice, backend };
}

async function deploy(
  initialize = false,
  verify = false,
  name_prefix = '',
  RNDdeployParams = _RNDdeployParams,
  VCdeployParams = _VCdeployParams,
  SMdeployParams = _SMdeployParams,
  NFTdeployParams = _NFTdeployParams,
  GovDeployParams = _GovDeployParams) {

  // Rename deployed contracts
  if (name_prefix != '') {
    RNDdeployParams._name = name_prefix + ' ' + RNDdeployParams._name;
    VCdeployParams._name = name_prefix + ' ' + VCdeployParams._name;
    SMdeployParams._name = name_prefix + ' ' + SMdeployParams._name;
    NFTdeployParams._name = name_prefix + ' ' + NFTdeployParams._name;
    GovDeployParams._name = name_prefix + ' ' + GovDeployParams._name;

    // Set mainnet live symbols and params
    if (name_prefix == 'RND') {
      RNDdeployParams._symbol = 'RND';
      VCdeployParams._symbol = 'vRND';
      SMdeployParams._symbol = 'stRND';
      NFTdeployParams._symbol = 'nftRND';
      GovDeployParams._symbol = 'govRND';

      RNDdeployParams._initialSupply = BigNumber.from(200e6);   // 200M
      VCdeployParams._periodSeconds = 1 * 60 * 60 * 24;         // 1 day
      SMdeployParams._cooldown_seconds = 1 * 60 * 60 * 24;      // 1 day
      SMdeployParams._unstake_window = 1 * 60 * 60 * 24 * 10;   // 10 day
    }

  }

  // Getting network information 
  gotNetwork = await ethers.provider.getNetwork();
  chainId = gotNetwork.chainId;
  localNode = 31337; // local default chainId from hardhat.config.js
  console.log('Network: ', gotNetwork.name, chainId);
  if (chainId == localNode && verify) {
    console.log("Cannot verify as its local network.");
  }
  // Wait for confirmations
  const numberOfConfirmationsOnTestnet = 1;
  numConfirmation = chainId !== localNode ? numberOfConfirmationsOnTestnet : 0;
  console.log('Number of confirmations to wait:', numConfirmation, "\n");

  // Fetching keys
  [owner, alice, backend] = await ethers.getSigners();
  console.log("Deployer address:", owner.address);
  console.log("Alice address:", alice.address);
  console.log("Backend address:", backend.address);
  console.log("");

  Registry = await ethers.getContractFactory("AddressRegistry");
  Token = await ethers.getContractFactory("RandToken");
  VestingController = await ethers.getContractFactory("VestingControllerERC721");
  SafetyModule = await ethers.getContractFactory("StakedRand");
  InvestorsNFT = await ethers.getContractFactory("InvestorsNFT");
  Governance = await ethers.getContractFactory("Governance");
  Reserve = await ethers.getContractFactory("EcosystemReserve");

  multisig_address = owner.address;
  oz_defender = backend.address;

  RandRegistry = await upgrades.deployProxy(
    Registry,
    [multisig_address],
    { kind: "uups" });
  console.log('Deployed Registry proxy at:', RandRegistry.address);
  txRandReg = RandRegistry.deployTransaction;
  await txRandReg.wait(numConfirmation);

  // Initializing Registry
  tx = await RandRegistry.setNewAddress("MS", multisig_address);
  await tx.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("OZ", oz_defender);
  await tx.wait(numConfirmation);

  RandReserve = await upgrades.deployProxy(
    Reserve,
    [RandRegistry.address],
    { kind: "uups" });
  console.log('Deployed Reserve proxy at:', RandReserve.address);
  txRandReserve = RandReserve.deployTransaction;
  await txRandReserve.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("RES", RandReserve.address);
  await tx.wait(numConfirmation);

  RNDdeployParams._registry = RandRegistry.address;
  VCdeployParams._registry = RandRegistry.address;
  SMdeployParams._registry = RandRegistry.address;
  NFTdeployParams._registry = RandRegistry.address;
  GovDeployParams._registry = RandRegistry.address;

  RandToken = await upgrades.deployProxy(
    Token,
    Object.values(RNDdeployParams),
    { kind: "uups" });
  console.log('------------------- TOKEN INFO ---------------------');
  console.log('Deployed Token proxy at:', RandToken.address);
  var totalSupply = await RandToken.totalSupply();
  var decimals = await RandToken.decimals();
  var readableTotalSupply = ethers.utils.formatUnits(totalSupply, decimals);
  var formatter = new Intl.NumberFormat('en-US', {});
  console.log('Token name:', await RandToken.name());
  console.log('Token symbol:', await RandToken.symbol());
  console.log('Token supply:', totalSupply);
  console.log('Token decimals:', decimals);
  console.log('Token supply readable:', formatter.format(parseInt(readableTotalSupply)));
  //console.log('-----------------------------------------------------');
  txRandToken = RandToken.deployTransaction;
  await txRandToken.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("RND", RandToken.address);
  await tx.wait(numConfirmation);

  RandVC = await upgrades.deployProxy(
    VestingController,
    Object.values(VCdeployParams),
    { kind: "uups" });
  console.log('\n------------------- VC INFO ---------------------');
  console.log('Deployed VC proxy at:', RandVC.address);
  var totalSupply = await RandVC.totalSupply();
  console.log('VC name:', await RandVC.name());
  console.log('VC symbol:', await RandVC.symbol());
  console.log('VC supply:', totalSupply);
  //console.log('-----------------------------------------------------');
  txRandVC = RandVC.deployTransaction;
  await txRandVC.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("VC", RandVC.address);
  await tx.wait(numConfirmation);

  RandSM = await upgrades.deployProxy(
    SafetyModule,
    Object.values(SMdeployParams),
    { kind: "uups" });
  console.log('\n------------------- SM INFO ---------------------');
  console.log('Deployed SM proxy at:', RandSM.address);
  var totalSupply = await RandSM.totalSupply();
  var decimals = await RandSM.decimals();
  var readableTotalSupply = ethers.utils.formatUnits(totalSupply);
  var formatter = new Intl.NumberFormat('en-US', {});
  console.log('VC name:', await RandSM.name());
  console.log('VC symbol:', await RandSM.symbol());
  console.log('VC supply:', totalSupply);
  console.log('VC supply readable:', formatter.format(parseInt(readableTotalSupply)));
  //console.log('-----------------------------------------------------');
  txRandSM = RandSM.deployTransaction;
  await txRandSM.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("SM", RandSM.address);
  await tx.wait(numConfirmation);

  RandNFT = await upgrades.deployProxy(
    InvestorsNFT,
    Object.values(NFTdeployParams),
    { kind: "uups" });
  console.log('\n------------------- NFT INFO ---------------------');
  console.log('Deployed NFT proxy at:', RandNFT.address);
  var totalSupply = await RandNFT.totalSupply();
  console.log('NFT name:', await RandNFT.name());
  console.log('NFT symbol:', await RandNFT.symbol());
  console.log('NFT supply:', totalSupply);
  //console.log('-----------------------------------------------------');
  txRandNFT = RandNFT.deployTransaction;
  await txRandNFT.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("NFT", RandNFT.address);
  await tx.wait(numConfirmation);

  RandGov = await upgrades.deployProxy(
    Governance,
    Object.values(GovDeployParams),
    { kind: "uups" });
  console.log('\n------------------- GOV INFO ---------------------');
  console.log('Deployed Gov proxy at:', RandGov.address);
  var totalSupply = await RandGov.totalSupply();
  var decimals = await RandGov.decimals();
  var readableTotalSupply = ethers.utils.formatUnits(totalSupply, decimals);
  var formatter = new Intl.NumberFormat('en-US', {});
  console.log('GOV name:', await RandGov.name());
  console.log('GOV symbol:', await RandGov.symbol());
  console.log('GOV supply:', totalSupply);
  console.log('GOV decimals:', decimals);
  console.log('GOV supply readable:', formatter.format(parseInt(readableTotalSupply)));
  //console.log('-----------------------------------------------------');
  txRandGov = RandGov.deployTransaction;
  await txRandGov.wait(numConfirmation);
  tx = await RandRegistry.setNewAddress("GOV", RandGov.address);
  await tx.wait(numConfirmation);

  // Verify contracts
  console.log('\n--------------- IMPLEMENTATION INFO -----------------');
  RandRegistryImpl = await upgrades.erc1967.getImplementationAddress(RandRegistry.address);
  console.log('Deployed Registry implementation at:', RandRegistryImpl);
  RandTokenImpl = await upgrades.erc1967.getImplementationAddress(RandToken.address);
  console.log('Deployed Token implementation at:', RandTokenImpl);
  RandVCImpl = await upgrades.erc1967.getImplementationAddress(RandVC.address);
  console.log('Deployed VC implementation at:', RandVCImpl);
  RandSMImpl = await upgrades.erc1967.getImplementationAddress(RandSM.address);
  console.log('Deployed SM implementation at:', RandSMImpl);
  RandNFTImpl = await upgrades.erc1967.getImplementationAddress(RandNFT.address);
  console.log('Deployed NFT implementation at:', RandNFTImpl);
  RandGovImpl = await upgrades.erc1967.getImplementationAddress(RandGov.address);
  console.log('Deployed Gov implementation at:', RandGovImpl);
  console.log('-----------------------------------------------------');

  if (initialize) {
    // Variables
    // solidity timestamp
    last_block = await ethers.provider.getBlock();
    created_ts = last_block.timestamp;
    recipient = alice.address;
    vestingStartTime = BigNumber.from(created_ts);
    rndTokenAmount = ethers.utils.parseEther('100');
    vestingPeriod = BigNumber.from("864000"); // 1 week
    cliffPeriod = BigNumber.from("1");
    tokenId_100 = 1;
    tokenId_101 = 2;

    console.log("\nStarting contract initialization - allowance, minting, etc...");
    // Initializing Safety Module
    // Init SM _updateAsset
    emissionPerSec = ethers.utils.parseEther("1"); // 1 RND per seconds
    const update_tx = await RandSM.updateAsset(
      await RandRegistry.getAddress("SM"),  // staked asset address
      emissionPerSec,                       // emissionRate
      ethers.utils.parseEther("0")          // totalStaked
    );
    console.log("SM updateAsset done with emissionRate set at:", emissionPerSec);

    // Transfer RND to Reserve 
    reserveAmount = rndTokenAmount.mul(10);
    tx = await RandToken.transfer(RandReserve.address, reserveAmount);
    await tx.wait(numConfirmation);
    console.log("Reserve balance of RND:", await RandToken.balanceOf(RandReserve.address));

    // Add allowance for VC to fetch tokens in claim
    allowanceAmount = rndTokenAmount.mul(10);
    tx = await RandToken.increaseAllowance(RandVC.address, allowanceAmount);
    await tx.wait(numConfirmation);
    console.log("Allowance increased for RandVC in amount:", allowanceAmount);

    // Mint investment without NFT
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

    // Mint investment with NFT
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
    console.log('Minted investments without NFT tokens:', e_tokenId);
    console.log('Minted investments with NFT tokens:', e_tokenId1, e_tokenId2);
  }

  // Verify contracts
  if (chainId !== localNode && verify) {
    console.log("Starting verification process...");
    await hre.run("verify:verify", { address: RandTokenImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });

    await hre.run("verify:verify", { address: RandVCImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });

    await hre.run("verify:verify", { address: RandSMImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });

    await hre.run("verify:verify", { address: RandRegistryImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });
    await hre.run("verify:verify", { address: RandNFTImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });
    await hre.run("verify:verify", { address: RandGovImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });
  }
  return { RandToken, RandVC, RandSM, RandNFT, RandGov, RandRegistry, RandReserve };
}

module.exports = {
  deploy,
  get_factories,
  get_wallets,
  _RNDdeployParams,
  _VCdeployParams,
  _SMdeployParams,
  _NFTdeployParams,
  _GovDeployParams,
};
