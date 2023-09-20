//require('@openzeppelin/hardhat-upgrades');
//require("@openzeppelin/hardhat-defender");
//const { AdminClient } = require('@openzeppelin/defender-admin-client');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("@tenderly/hardhat-tenderly");
require("solidity-coverage");
require('@adradr/hardhat-dodoc');
require('hardhat-deploy');
require("hardhat-deploy-ethers");
require('dotenv').config();

const axios = require('axios');
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);
const prompt = require('prompt-sync')();

const { abi2sol, abi2json } = require("./scripts/abi2sol.js");
const { execute, cleanFile } = require("./scripts/utils_flatten.js");
const { chains } = require("./scripts/utils_etherscan_config.js");


// Get network id for Etherscan verification task
function findNetworInArgs(item, index, arr) {
  //console.log(item, index, arr);
  if (item == '--network') {
    network_id = arr[index + 1];
    if (network_id == 'hardhat') return;
    network_dict = chains[network_id];
    network_id = network_dict.urls.apiURL;
    chain_id = network_dict.chainId;
    // 1,3,4,5,42 eth
    // 1287 moonbase
    if (chain_id == 1287) {
      etherscan_api_key = process.env.MOONSCAN_API_KEY;
    }
    else {
      etherscan_api_key = process.env.ETHERSCAN_API_KEY;
    }
  }
}

// Get network id for Etherscan verification task
var network_id;
var chain_id;
process.argv.forEach(findNetworInArgs);

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    balanceOf = await ethers.provider.getBalance(account.address);
    console.log(account.address, '(', ethers.utils.formatEther(balanceOf), ')');
  }
});


task("abi2interface", "Generates solidity interface contracts from ABIs, needs to matching contract name .sol name")
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


task("verifyProxy", "Verifies a proxy on Etherscan using the current network so Read/Write as proxy is avaiable")
  .addParam("proxy", "Address of the proxy contract to verify")
  .addParam("implementation", "Address of the implementation contract")
  .setAction(async ({ proxy, implementation }) => {
    if (chain_id == 31337) {
      console.log("Unable to verify proxy on local development network. Exiting...");
      return;
    }
    console.log("Starting verification.");
    data = {
      "address": proxy,
      "expectedimplementation": implementation
    };
    url = `${network_id}?module=contract&action=verifyproxycontract&apikey=${etherscan_api_key}`;

    await axios({
      method: "post",
      url: url,
      data: data,
    })
      .then(function (response) {
        //handle success
        console.log(response.data);
      })
      .catch(function (response) {
        //handle error
        console.log(response);
      });
  });


task("upgradeProxyAndVerify", "Upgrades proxy with OZ upgrades plugin and verifies new implementation")
  .addPositionalParam("proxyAddress", "Address of the proxy contract")
  .addPositionalParam("contractFactory", "Name of the contract")
  .addFlag("verify", "To verify new implementation with Etherscan API")
  .setAction(async ({ proxyAddress, contractFactory, verify }) => {
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
    if (verify) {
      newImplementation = await upgrades.erc1967.getImplementationAddress(tx.address);
      await hre.run("verify:verify", { address: newImplementation }).catch(function (error) {
        if (error.message == 'Contract source code already verified') {
          console.error('Contract source code already verified');
        }
        else {
          console.error(error);
        }
      });
    }
  });

gasPriceApis = {
  sepolia: 'https://api-sepolia.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  goerli: 'https://api-goerli.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  mainnet: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  hardhat: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  polygon: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.POLYGONSCAN_API_KEY,
  polygonMumbai: 'https://api-testnet.polygonscan.com/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.POLYGONSCAN_API_KEY,
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
  defender: {
    apiKey: process.env.DEFENDER_API_KEY,
    apiSecret: process.env.DEFENDER_API_SECRET_KEY,
  },
  gasReporter: {
    enabled: reportGasSwitch,
    //outputFile: './gas_profile.txt',
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
      chainId: 31337,
      blockGasLimit: 120e6,
      allowUnlimitedContractSize: true,
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts: accountkeys,
    },
    sepolia: {
      url: process.env.SEPOLIA_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      //gasPrice: 200e9
    },
    goerli: {
      url: process.env.GOERLI_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      // verify: {
      //   etherscan: {
      //     apiKey: process.env.ETHERSCAN_API_KEY
      //   }
      // }
    },
    polygonMumbai: {
      url: process.env.POLYGON_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
    }
  },
  // compiler
  solidity: {
    compilers: [
      { // Proxy contracts
        version: "0.6.12",
        settings: {
          metadata: {
            useLiteralContent: true,
          },
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      { // Rand contracts
        version: "0.8.2",
        settings: {
          metadata: {
            useLiteralContent: true,
          },
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
    ],

  },
  // paths
  paths: {
    sources: "./contracts/",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments",
  },
  // hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0,
    },
    owner: {
      default: 0,
    },
    alice: {
      default: 1,
    },
    backend: {
      default: 2,
    },
  },
  saveDeployments: true,
  // test
  mocha: {
    timeout: 5 * 60 * 1e3
  },
  // tenderly
  tenderly: {
    username: process.env.TENDERLY_USERNAME || '',
    project: process.env.TENDERLY_PROJECT || ''
  },
  // dodoc docs
  dodoc: {
    runOnCompile: true,
    debugMode: false,
    keepFileStructure: true,
    freshOutput: true,
    outputDir: './docs',
    include: ['ecosystem'],
    exclude: ['/contracts/mock'],
    tableOfContents: true
  },
};