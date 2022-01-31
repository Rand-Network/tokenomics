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
    _name: "Rand Token ERC20",
    _symbol: "RND",
    _initialSupply: BigNumber.from(200e6),
    _multisigVault: owner.address
  }

  const VCdeployParams = {
    _name: "Rand Vesting Controller ERC721",
    _symbol: "vRND",
    _rndTokenContract: 0, //RandToken.address,
    _smTokenContract: 0, //RandToken.address - as of now
    _periodSeconds: 1,
    _multiSigAddress: owner.address,
    _backendAddress: backend.address
  }

  const numberOfConfirmationsOnTestnet = 1;
  numConfirmation = chainId !== localNode ? numberOfConfirmationsOnTestnet : 0

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
  VCdeployParams._smTokenContract = RandToken.address;
  VCdeployParams._multiSigAddress = owner.address;
  VCdeployParams._backendAddress = backend.address;

  RandVC = await upgrades.deployProxy(
    VestingController,
    Object.values(VCdeployParams),
    { kind: "uups" });

  // let RandVC, VestingController = await deployContractWithProxy(
  //   "VestingControllerERC721",
  //   VCdeployParams,
  //   numConfirmation)
  // console.log('Deployed VC proxy at:', RandVC.address);

  // Wait for confirmations
  numConfirmation = chainId !== localNode ? numberOfConfirmationsOnTestnet : 0
  console.log('Number of confirmations to wait:', numConfirmation)
  if (chainId !== localNode) {
    txRandToken = RandToken.deployTransaction;
    txRandVC = RandVC.deployTransaction;
    await txRandToken.wait(numConfirmation);
    await txRandVC.wait(numConfirmation);
  }

  // Verify contracts
  txRandToken = RandToken.deployTransaction;
  await txRandToken.wait(1);
  RandTokenImpl = await ethers.provider.getStorageAt(RandToken.address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
  RandTokenImpl = await ethers.utils.hexStripZeros(RandTokenImpl);
  RandTokenImpl = await ethers.utils.getAddress(RandTokenImpl);
  RandVCImpl = await ethers.provider.getStorageAt(RandVC.address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
  RandVCImpl = await ethers.utils.hexStripZeros(RandVCImpl);
  RandVCImpl = await ethers.utils.getAddress(RandVCImpl);
  console.log('Deployed VC implementation at:', RandVCImpl);

  // Verify contracts
  try {
    await hre.run("verify:verify", {
      address: RandToken.address,
      constructorArguments: Object.values(RNDdeployParams)
    });
  } catch (error) {
    console.error(error);
  }
  try {
    await hre.run("verify:verify", { address: RandVCImpl });
  } catch (error) {
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
