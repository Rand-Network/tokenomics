require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
const { BigNumber } = require("ethers");
require("ethers");
const EtherscanChainConfig = require('./EtherscanChainConfig.js');
const fs = require('fs');
const path = require('path');

async function convertToCSV(arr) {
  const array = [Object.keys(arr[0])].concat(arr);

  return array.map(it => {
    return Object.values(it).toString();
  }).join('\n');
}

async function export_csv_data(data) {
  // Convert JSON to array
  const arr = await convertToCSV(data);
  // Get project root path
  const project_root = path.resolve(process.cwd(), 'deployment.csv');
  await fs.writeFileSync(project_root, arr, 'utf8');
}

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
  RewardDistributionManager = await ethers.getContractFactory("RewardDistributionManagerV2");
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
  test_mint = false,
  export_csv = false,
  name_prefix = 'default',
  multisig = 'default',
  relayer = 'default',
  RNDdeployParams = _RNDdeployParams,
  VCdeployParams = _VCdeployParams,
  SMdeployParams = _SMdeployParams,
  NFTdeployParams = _NFTdeployParams,
  GovDeployParams = _GovDeployParams) {

  // If we are initilializing, we need to get the multisig and relayer addresses from arguments passed to hh task
  if (initialize) {
    if (multisig == "default" || relayer == "default") {
      throw new Error("Missing argument, multisig and relayer addresses must be provided when initializing");
    }

    if (test_mint) {
      throw new Error("Cannot mint test tokens when initializing. Initialize is for mainnet deployment only.");
    }
  }

  // Rename deployed contracts
  if (name_prefix != '') {
    RNDdeployParams._name = name_prefix + ' ' + RNDdeployParams._name;
    VCdeployParams._name = name_prefix + ' ' + VCdeployParams._name;
    SMdeployParams._name = name_prefix + ' ' + SMdeployParams._name;
    NFTdeployParams._name = name_prefix + ' ' + NFTdeployParams._name;
    GovDeployParams._name = name_prefix + ' ' + GovDeployParams._name;

    // Set mainnet live symbols and params
    if (name_prefix == 'Rand') {
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
  const gotNetwork = await ethers.provider.getNetwork();
  const chainId = gotNetwork.chainId;
  console.log('Network: ', gotNetwork.name, chainId);
  // Wait for confirmations
  const localNode = 31337; // local default chainId from hardhat.config.js
  // Define number of block to wait for confirmation
  const numConfirmation = chainId !== localNode ? 1 : 0;
  console.log('Number of confirmations to wait:', numConfirmation, "\n");
  // Throw error if not on mainnet and want to verify
  if (chainId == localNode && verify) {
    throw new Error("Cannot verify as its local network.");
  }

  // Fetching keys
  [owner, alice, backend] = await ethers.getSigners();
  console.log("Deployer address:", owner.address);
  console.log("Alice address:", alice.address);
  console.log("Backend address:", backend.address);
  console.log("");

  // Fetching factories
  Registry = await ethers.getContractFactory("AddressRegistry");
  Token = await ethers.getContractFactory("RandToken");
  VestingController = await ethers.getContractFactory("VestingControllerERC721");
  SafetyModule = await ethers.getContractFactory("StakedRand");
  InvestorsNFT = await ethers.getContractFactory("InvestorsNFT");
  Governance = await ethers.getContractFactory("Governance");
  Reserve = await ethers.getContractFactory("EcosystemReserve");

  // Deploying contracts
  console.log('------------------ REGISTRY INFO --------------------');
  RandRegistry = await upgrades.deployProxy(
    Registry,
    [owner.address],
    { kind: "uups" });
  console.log('Deployed Registry proxy at:', RandRegistry.address);
  txRandReg = RandRegistry.deployTransaction;
  await txRandReg.wait(numConfirmation);

  // Initializing Registry
  tx = await RandRegistry.setNewAddress("MS", owner.address);
  await tx.wait(numConfirmation);
  // Set oz_defender address if relayer is supplied otherwise use backend from loaded .env
  oz_defender = relayer == 'default' ? backend.address : relayer;
  tx = await RandRegistry.setNewAddress("OZ", oz_defender);
  await tx.wait(numConfirmation);

  console.log('\n------------------- RESERVE INFO ---------------------');
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
  console.log('\n------------------- TOKEN INFO ---------------------');
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
  console.log('Deployed Governance implementation at:', RandGovImpl);
  RandResImpl = await upgrades.erc1967.getImplementationAddress(RandReserve.address);
  console.log('Deployed Reserve implementation at:', RandResImpl);

  // Export CSV 
  if (export_csv) {
    // Loop over EtherscanChainConfig and find the corresponding key name inside chain based on chanId
    for (var key in EtherscanChainConfig.chains) {
      var obj = EtherscanChainConfig.chains[key];
      if (obj.chainId == chainId) {
        var network_name = key;
        var explorer_url = EtherscanChainConfig.chains[key].urls.browserURL + '/address/';
      }
    }
    // Get Github latest commit on current branch
    var revision = require('child_process').execSync('git rev-parse HEAD').toString().trim();
    revision = `https://github.com/Rand-Network/tokenomics/commit/${revision}`;
    // Get environment 
    const environment = (initialize & name_prefix == 'Rand') ? "Production" : "Development";
    // Set csv data
    const deployed_addresses = [
      {
        name: "Registry",
        address: RandRegistry.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandRegistryImpl,
        network_name: network_name,
        explorer: explorer_url + RandRegistry.address
      },
      {
        name: "Token",
        address: RandToken.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandTokenImpl,
        network_name: network_name,
        explorer: explorer_url + RandToken.address
      },
      {
        name: "Vesting Controller",
        address: RandVC.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandVCImpl,
        network_name: network_name,
        explorer: explorer_url + RandVC.address
      },
      {
        name: "Safety Module",
        address: RandSM.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandSMImpl,
        network_name: network_name,
        explorer: explorer_url + RandSM.address
      },
      {
        name: "NFT",
        address: RandNFT.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandNFTImpl,
        network_name: network_name,
        explorer: explorer_url + RandNFT.address
      },
      {
        name: "Governance",
        address: RandGov.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandGovImpl,
        network_name: network_name,
        explorer: explorer_url + RandGov.address
      },
      {
        name: "Reserve",
        address: RandReserve.address,
        commit_hash: revision,
        environment: environment,
        implementation: RandResImpl,
        network_name: network_name,
        explorer: explorer_url + RandReserve.address
      },


    ];
    console.log('\n--------------- EXPORTING CSV -----------------');
    await export_csv_data(deployed_addresses);
    console.log('CSV exported to project root:', path.resolve(process.cwd(), 'deployment.csv'));
  }


  // Initialize live contracts for mainnet deployment
  // Set roles for each contract
  // Pass to multisig DEFAULT_ADMIN_ROLE
  // Pass to relayer required roles
  if (initialize) {
    console.log('\n--------------- INITIALIZE INFO -----------------');
    console.log('Granting roles to multisig and relayer, and renouncing from deployer, and updating MS address in registry...');

    // Get each role used in tokenomics
    const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await RandToken.MINTER_ROLE();
    const PAUSER_ROLE = await RandToken.PAUSER_ROLE();
    // Set roles for each contract
    // RND Token
    await RandToken.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandToken.grantRole(MINTER_ROLE, multisig);
    await RandToken.grantRole(PAUSER_ROLE, multisig);
    await RandToken.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);
    await RandToken.renounceRole(MINTER_ROLE, owner.address);
    await RandToken.renounceRole(PAUSER_ROLE, owner.address);
    // VC Token
    await RandVC.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandVC.grantRole(MINTER_ROLE, multisig);
    await RandVC.grantRole(PAUSER_ROLE, multisig);
    await RandVC.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);
    await RandVC.renounceRole(MINTER_ROLE, owner.address);
    await RandVC.renounceRole(PAUSER_ROLE, owner.address);
    // SM Token
    await RandSM.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandSM.grantRole(PAUSER_ROLE, multisig);
    await RandSM.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);
    await RandSM.renounceRole(PAUSER_ROLE, owner.address);
    // NFT Token
    await RandNFT.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandNFT.grantRole(MINTER_ROLE, multisig);
    await RandNFT.grantRole(PAUSER_ROLE, multisig);
    await RandNFT.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);
    await RandNFT.renounceRole(MINTER_ROLE, owner.address);
    await RandNFT.renounceRole(PAUSER_ROLE, owner.address);
    // GOV Token
    await RandGov.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandGov.grantRole(PAUSER_ROLE, multisig);
    await RandGov.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);
    await RandGov.renounceRole(PAUSER_ROLE, owner.address);
    // Registry update MultiSig MS 
    await RandRegistry.updateAddress("MS", multisig);
    // Registry

    console.log(await RandRegistry.hasRole(DEFAULT_ADMIN_ROLE, multisig));
    console.log(await RandRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address));

    await RandRegistry.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandRegistry.grantRole(PAUSER_ROLE, multisig);
    await RandRegistry.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);
    await RandRegistry.renounceRole(PAUSER_ROLE, owner.address);

    console.log('\nRandToken');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log('Is MINTER_ROLE still the DEPLOYER?', await RandToken.hasRole(MINTER_ROLE, owner.address));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandToken.hasRole(PAUSER_ROLE, owner.address));
    console.log('\nRandVC');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandVC.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log('Is MINTER_ROLE still the DEPLOYER?', await RandVC.hasRole(MINTER_ROLE, owner.address));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandVC.hasRole(PAUSER_ROLE, owner.address));
    console.log('\nRandSM');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandSM.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandSM.hasRole(PAUSER_ROLE, owner.address));
    console.log('\nRandNFT');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandNFT.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log('Is MINTER_ROLE still the DEPLOYER?', await RandNFT.hasRole(MINTER_ROLE, owner.address));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandNFT.hasRole(PAUSER_ROLE, owner.address));
    console.log('\nRandGov');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandGov.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandGov.hasRole(PAUSER_ROLE, owner.address));
    console.log('\nRandRegistry');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandRegistry.hasRole(PAUSER_ROLE, owner.address));
    console.log('Registry MS current address:', await RandRegistry.getAddress("MS"));
    console.log('Registry MS addresses:', await RandRegistry.getAllAddress("MS"));

    // [] Transfer initial RND supply to the treasury account OR increase RND allowance for the VC over the total amount of investments to be minted
    // [] Initialize SM assets with the asset config params
    // [] Transfer RND supply to the Reserve for the SM rewards

  }

  // Mint sample tokens for test deployment
  if (test_mint) {
    console.log('\n--------------- TEST_MINT INFO -----------------');
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

    console.log("\nStarting contract test minting - allowance, minting, etc...");
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
    console.log('\n--------------- VERIFY INFO -----------------');
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
