require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
const { BigNumber } = require("ethers")
const { ethers, upgrades, network } = require("hardhat");

async function deployContractWithProxy(contractName, initParams, numConfirmation, proxyKind = 'uups') {
  // Deploying contracts
  let Contract = await ethers.getContractFactory(contractName);
  let ContractProxy = await upgrades.deployProxy(
    Contract,
    Object.values(initParams),
    { kind: proxyKind });

  // Wait for confirmations
  if (chainId !== localNode) {
    console.log('Number of confirmations to wait after deployment:', numConfirmation)
    txContractDeployment = ContractProxy.deployTransaction;
    await txContractDeployment.wait(numConfirmation);
  }

  return ContractProxy, Contract

}

async function main() {

  // Getting network information 
  gotNetwork = await ethers.provider.getNetwork();
  chainId = gotNetwork.chainId;
  localNode = 31337; // local default chainId from hardhat.config.js
  console.log('Network: ', gotNetwork.name, chainId);

  // Fetching keys
  [owner, alice, backend] = await ethers.getSigners();

  // Deployment params for initializer
  const RNDdeployParams = {
    _name: "Token ERC20",
    _symbol: "tRND",
    _initialSupply: BigNumber.from(200e6),
    _multisigVault: owner.address
  }

  const VCdeployParams = {
    _name: "Vesting Controller ERC721",
    _symbol: "tvRND",
    _rndTokenContract: 0, //RandToken.address,
    _smTokenContract: 0, //RandToken.address - as of now
    _periodSeconds: 1,
    _multiSigAddress: owner.address,
    _backendAddress: backend.address
  }

  // Deploying contracts
  // Token Contract
  // let RandToken, Token = await deployContractWithProxy(
  //   "RandToken",
  //   RNDdeployParams,
  //   numConfirmation)
  Token = await ethers.getContractFactory("RandToken");
  VestingController = await ethers.getContractFactory("VestingControllerERC721");

  RandToken = await upgrades.deployProxy(
    Token,
    Object.values(RNDdeployParams),
    { kind: "uups" });
  console.log('Deployed Token proxy at:', RandToken.address);

  // Vesting Controller
  VCdeployParams._rndTokenContract = RandToken.address;
  VCdeployParams._smTokenContract = owner.address;
  VCdeployParams._multiSigAddress = owner.address;
  VCdeployParams._backendAddress = backend.address;

  RandVC = await upgrades.deployProxy(
    VestingController,
    Object.values(VCdeployParams),
    { kind: "uups" });

  console.log('Deployed VC proxy at:', RandVC.address);
  // let RandVC, VestingController = await deployContractWithProxy(
  //   "VestingControllerERC721",
  //   VCdeployParams,
  //   numConfirmation)


  // Wait for confirmations
  const numberOfConfirmationsOnTestnet = 1;
  numConfirmation = chainId !== localNode ? numberOfConfirmationsOnTestnet : 0
  console.log('Number of confirmations to wait:', numConfirmation)
  if (chainId !== localNode) {
    txRandToken = RandToken.deployTransaction;
    txRandVC = RandVC.deployTransaction;
    await txRandToken.wait(numConfirmation);
    await txRandVC.wait(numConfirmation);
  }

  // Setting SM contract address on Rand Token
  await RandToken.updateSMAddress(owner.address);
  SM_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('SM_ROLE'));
  console.log('Does owner has SM_ROLE on RND: ', await RandToken.hasRole(SM_ROLE, owner.address));

  // Verify contracts
  txRandToken = RandToken.deployTransaction;
  await txRandToken.wait(1);
  // RandTokenImpl = await ethers.provider.getStorageAt(RandToken.address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
  // RandTokenImpl = await ethers.utils.hexStripZeros(RandTokenImpl);
  // RandTokenImpl = await ethers.utils.getAddress(RandTokenImpl);
  // RandVCImpl = await ethers.provider.getStorageAt(RandVC.address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
  // RandVCImpl = await ethers.utils.hexStripZeros(RandVCImpl);
  // RandVCImpl = await ethers.utils.getAddress(RandVCImpl);

  RandTokenImpl = await upgrades.erc1967.getImplementationAddress(RandToken.address);
  RandVCImpl = await upgrades.erc1967.getImplementationAddress(RandVC.address);
  console.log('Deployed Token implementation at:', RandTokenImpl);
  console.log('Deployed VC implementation at:', RandVCImpl);

  // Verify contracts
  if (chainId !== localNode) {
    return
    await hre.run("verify:verify", { address: RandTokenImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified')
      }
      else {
        console.error(error)
      }
    });

    await hre.run("verify:verify", { address: RandVCImpl }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified')
      }
      else {
        console.error(error)
      }
    });
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
