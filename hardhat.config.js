require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-etherscan');
require("hardhat-gas-reporter");
require("@atixlabs/hardhat-time-n-mine");
//require("hardhat-interface-generator");
require('dotenv').config();
const balance = require("@openzeppelin/test-helpers/src/balance");
const { abi2sol } = require("./scripts/abi2sol.js");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address)
  }
});

task("abi2interface", "Generates solidity interface contracts from ABIs")
  .addPositionalParam("contract", "Solidity contract name")
  .setAction(async ({ contract }) => {
    await abi2sol(contract);
  });

gasPriceApis = {
  goerli: 'https://api-goerli.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  ropsten: 'https://api-ropsten.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  rinkeby: 'https://api-rinkeby.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  mainnet: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  hardhat: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY
}

let gasPriceApi;
if (process.argv.includes('--network')) {
  idx = process.argv.indexOf('--network');
  gasPriceApi = gasPriceApis[process.argv[idx + 1]];
}

//[owner, proxyAdmin, alice, backend] = await ethers.getSigners();
const envkeys = [
  //process.env.PROXYADMIN_PRIVATE_KEY,
  process.env.ALICE_PRIVATE_KEY,
  process.env.MULTISIG_PRIVATE_KEY,
  process.env.BACKEND_PRIVATE_KEY
]

const accountkeys = []
for (const key of envkeys) {
  if (typeof key !== 'undefined' && key !== '') {
    accountkeys.push(key);
  }
}

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    //outputFile: './output.txt',
    gasPriceApi: gasPriceApi,
    noColors: true,
    showTimeSpent: true,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337
    },
    development: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts: accountkeys,
    },
    rinkeby: {
      url: process.env.RINKEBY_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      gasPrice: 200e9
    },
    goerli: {
      url: process.env.GOERLI_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      gasPrice: 200e9
    },
    ropsten: {
      url: process.env.ROPSTEN_TESTNET_URL || '',
      accounts: accountkeys,
      timeout: 5 * 60 * 1e3,
      gasPrice: 200e9
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
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
}