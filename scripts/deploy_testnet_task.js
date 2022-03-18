require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
const { BigNumber } = require("ethers");
//const { ethers, upgrades, network } = require("hardhat");

async function deploy_testnet(initialize = false, verify = false) {
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

  const NFTdeployParams = {
    _name: "Rand Early Investors NFT",
    _symbol: "RandNFT",
    _registry: ""
  };

  Registry = await ethers.getContractFactory("AddressRegistry");
  Token = await ethers.getContractFactory("RandToken");
  VestingController = await ethers.getContractFactory("VestingControllerERC721");
  SafetyModule = await ethers.getContractFactory("SafetyModuleERC20");
  InvestorsNFT = await ethers.getContractFactory("InvestorsNFT");

  multisig_address = owner.address;
  oz_defender = owner.address;

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
  NFTdeployParams._registry = RandRegistry.address;

  RandToken = await upgrades.deployProxy(
    Token,
    Object.values(RNDdeployParams),
    { kind: "uups" });
  console.log('Deployed Token proxy at:', RandToken.address);
  await RandRegistry.setNewAddress("RND", RandToken.address);

  RandVC = await upgrades.deployProxy(
    VestingController,
    Object.values(VCdeployParams),
    { kind: "uups" });
  console.log('Deployed VC proxy at:', RandVC.address);
  await RandRegistry.setNewAddress("VC", RandVC.address);

  RandSM = await upgrades.deployProxy(
    SafetyModule,
    Object.values(SMdeployParams),
    { kind: "uups" });
  console.log('Deployed SM proxy at:', RandSM.address);
  await RandRegistry.setNewAddress("SM", RandSM.address);

  RandNFT = await upgrades.deployProxy(
    InvestorsNFT,
    Object.values(NFTdeployParams),
    { kind: "uups" });
  console.log('Deployed NFT proxy at:', RandNFT.address);
  await RandRegistry.setNewAddress("NFT", RandNFT.address);

  // Verify contracts
  txRandToken = RandToken.deployTransaction;
  txRandVC = RandVC.deployTransaction;
  txRandSM = RandSM.deployTransaction;
  txRandReg = RandRegistry.deployTransaction;
  txRandNFT = RandNFT.deployTransaction;
  await txRandToken.wait(numConfirmation);
  await txRandVC.wait(numConfirmation);
  await txRandSM.wait(numConfirmation);
  await txRandReg.wait(numConfirmation);
  await txRandNFT.wait(numConfirmation);

  console.log("");
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

  if (initialize) {
    // Variables
    // solidity timestamp
    last_block = await ethers.provider.getBlock();
    created_ts = last_block.timestamp;
    recipient = alice.address;
    vestingStartTime = BigNumber.from(created_ts);
    rndTokenAmount = ethers.utils.parseEther('100');
    vestingPeriod = BigNumber.from("86400"); // 1 week
    cliffPeriod = BigNumber.from("1");
    tokenId_100 = 1;
    tokenId_101 = 2;

    console.log("\nStarting contract initialization - allowance, minting, etc...");

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
  }
}

module.exports = { deploy_testnet };
