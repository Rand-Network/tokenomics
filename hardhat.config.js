require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-etherscan');
require("hardhat-gas-reporter");
require("@atixlabs/hardhat-time-n-mine");
require("solidity-coverage");
require('dotenv').config();
const { ContractFactory } = require("ethers");
const { abi2sol, abi2json } = require("./scripts/abi2sol.js");
const { deploy_testnet } = require("./scripts/deploy_testnet_task.js");
const { execute, cleanFile } = require("./scripts/flatten.js");

const pinataSDK = require('@pinata/sdk');
const { json } = require("hardhat/internal/core/params/argumentTypes");
const pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    balanceOf = await ethers.provider.getBalance(account.address);
    console.log(account.address, '(', ethers.utils.formatEther(balanceOf), ')');
  }
});

task("upgradeProxy", "Upgrades proxy with OZ upgrades plugin")
  .addPositionalParam("proxyAddress", "Address of the proxy contract")
  .addPositionalParam("contractFactory", "Name of the contract")
  .setAction(async ({ proxyAddress, contractFactory }) => {
    const accounts = await ethers.getSigners();
    var balanceOf = await ethers.provider.getBalance(accounts[0].address);
    console.log(accounts[0].address, '(balance:', ethers.utils.formatEther(balanceOf), ')');
    const ContractFactory = await ethers.getContractFactory(contractFactory);
    //tx = await upgrades.prepareUpgrade(proxyAddress, ContractFactory);
    tx = await upgrades.upgradeProxy(
      proxyAddress,
      ContractFactory
    );
    console.log(tx);
  });

task("upgradeProxyAndVerify", "Upgrades proxy with OZ upgrades plugin and verifies new implementation")
  .addPositionalParam("proxyAddress", "Address of the proxy contract")
  .addPositionalParam("contractFactory", "Name of the contract")
  .setAction(async ({ proxyAddress, contractFactory }) => {
    const accounts = await ethers.getSigners();
    var balanceOf = await ethers.provider.getBalance(accounts[0].address);
    console.log(accounts[0].address, '(balance:', ethers.utils.formatEther(balanceOf), ')');
    const ContractFactory = await ethers.getContractFactory(contractFactory);
    //tx = await upgrades.prepareUpgrade(proxyAddress, ContractFactory);
    tx = await upgrades.upgradeProxy(
      proxyAddress,
      ContractFactory,
      { timeout: 120000 }
    );
    tx_upgrade = tx.deployTransaction;
    await tx_upgrade.wait(1);
    console.log("Proxy upgraded!");

    newImplementation = await upgrades.erc1967.getImplementationAddress(tx.address);
    await hre.run("verify:verify", { address: newImplementation }).catch(function (error) {
      if (error.message == 'Contract source code already verified') {
        console.error('Contract source code already verified');
      }
      else {
        console.error(error);
      }
    });
  });

task("abi2interface", "Generates solidity interface contracts from ABIs")
  .addPositionalParam("contract", "Solidity contract name")
  .setAction(async ({ contract }) => {
    await abi2sol(contract);
  });

task("abi2ipfs", "Uploads ABI to IPFS and pins using Pinata")
  .addPositionalParam("contract", "Solidity contract name")
  .setAction(async ({ contract }) => {
    json_abi = await abi2json(contract);
    //console.log(json_abi);
    await pinata.pinJSONToIPFS(JSON.parse(json_abi)).then((result) => {
      console.log(`Successful upload of ${contract} to IPFS:\nhttps://ipfs.io/ipfs/${result.IpfsHash}\n`);
      console.log(result);
    }).catch((err) => {
      console.log(err);
    });
  });

task("folder2ipfs", "Uploads JSONs to IPFS and pins using Pinata")
  .addPositionalParam("folder", "")
  .setAction(async ({ folder }) => {
    project_path = process.mainModule.paths[0].split('node_modules')[0].slice(0, -1);
    sourcePath = project_path + '/' + folder;
    console.log(sourcePath);
    await pinata.pinFromFS(sourcePath).then((result) => {
      console.log(result);
      console.log(`Successful upload of ${folder} to IPFS:\nhttps://cloudflare-ipfs.com/ipfs/${result.IpfsHash}\n`);
    }).catch((err) => {
      console.log(err);
    });
  });

task("flatten-clean", "Flattens and cleans soldity contract for Etherscan single file verification")
  .addPositionalParam("contract", "Solidity contract path")
  .setAction(async ({ contract }) => {
    await execute(`hh flatten ${contract} > ${contract}.flatten`);
    await cleanFile(`${contract}.flatten`);
    await execute(`mv ${contract}.flatten.cleaned ${contract}.flatten`);
  });

task("deploy", "Deploys to a network and optionally verifies and mints sample investment")
  .addFlag("verify", "To verify the contract on the deployed network with Etherscan API")
  .addFlag("initialize", "To initially mint some investments and do allowances")
  .setAction(async ({ verify, initialize }) => {
    console.log("Starting deployment..");
    console.log("initialize:%s,\nverify:%s\n------------", initialize, verify);
    await deploy_testnet(initialize, verify);
  });


gasPriceApis = {
  goerli: 'https://api-goerli.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  ropsten: 'https://api-ropsten.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  rinkeby: 'https://api-rinkeby.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  mainnet: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  hardhat: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY
};

let gasPriceApi;
let reportGasSwitch = true;
if (process.argv.includes('--network')) {
  idx = process.argv.indexOf('--network');
  gasPriceApi = gasPriceApis[process.argv[idx + 1]];
  reportGasSwitch = true;
}

//[owner, proxyAdmin, alice, backend] = await ethers.getSigners();
const accountkeys = [
  //process.env.PROXYADMIN_PRIVATE_KEY,
  process.env.MULTISIG_PRIVATE_KEY,
  process.env.ALICE_PRIVATE_KEY,
  process.env.BACKEND_PRIVATE_KEY
];

module.exports = {
  gasReporter: {
    enabled: reportGasSwitch,
    //outputFile: './output.txt',
    gasPriceApi: gasPriceApi,
    noColors: true,
    showTimeSpent: true,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      // forking: {
      //   url: process.env.MAINNET_URL,
      // },
    },
    development: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    moonbeam: {
      url: process.env.MOONBEAM_URL || '',
      accounts: accountkeys,
    },
    moonbase: {
      url: process.env.MOONBASE_URL || '',
      accounts: accountkeys,
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts: accountkeys,
    },
    rinkeby: {
      url: process.env.RINKEBY_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      //gasPrice: 200e9,
      gas: 2100000
    },
    goerli: {
      url: process.env.GOERLI_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      //gasPrice: 200e9
    },
    ropsten: {
      url: process.env.ROPSTEN_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      gasPrice: 200e9
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY,
      mainnet: process.env.ETHERSCAN_API_KEY,
      //moonbeam: process.env.MOONSCAN_API_KEY,
      moonbaseAlpha: process.env.MOONSCAN_API_KEY
    }
  },
  solidity: {
    compilers: [
      { // Proxy contracts
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      { // Rand contracts
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],

  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 5 * 60 * 1e3
  }
};