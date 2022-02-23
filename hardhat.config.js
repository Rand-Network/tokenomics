require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-etherscan');
require("hardhat-gas-reporter");
require("@atixlabs/hardhat-time-n-mine");
require("solidity-coverage");
require('dotenv').config();
//require("hardhat-interface-generator");
const { abi2sol } = require("./scripts/abi2sol.js");
const { execute, cleanFile } = require("./scripts/flatten.js");


task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    balanceOf = await ethers.provider.getBalance(account.address);
    console.log(account.address, '(', ethers.utils.formatEther(balanceOf), ')')
  }
});

task("abi2interface", "Generates solidity interface contracts from ABIs")
  .addPositionalParam("contract", "Solidity contract name")
  .setAction(async ({ contract }) => {
    await abi2sol(contract);
  });

task("flatten-clean", "Flattens and cleans soldity contract for Etherscan single file verification")
  .addPositionalParam("contract", "Solidity contract path")
  .setAction(async ({ contract }) => {
    await execute(`hh flatten ${contract} > ${contract}.flatten`);
    await cleanFile(`${contract}.flatten`);
    await execute(`mv ${contract}.flatten.cleaned ${contract}.flatten`);
  });


gasPriceApis = {
  goerli: 'https://api-goerli.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  ropsten: 'https://api-ropsten.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  rinkeby: 'https://api-rinkeby.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  mainnet: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY,
  hardhat: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=' + process.env.ETHERSCAN_API_KEY
}

let gasPriceApi;
let reportGasSwitch = false;
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
]

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
}