# Rand Tokenomics

This repository stores the tokenomics ecosystem related contracts, scripts and test for Rand Network.

These contracts are the following:
- Rand Token contract (RND) ERC20
- Vesting Controller (VC) ERC721
- Safety Module (SM) ERC20
- Governance (rDAO) 

## Basic usage

To run the repository test follow these steps:
```
npm install .
npx hardhat node &
npx hardhat test
```

## Hardhat tasks implemented for ease of development and testing
There are several custom hardhat tasks have been implemented for deployment, upgrading, abi to interface conversion, contract flattening, ipfs uploads.

#### Examples

**abi2interface** generates an interface file from a `contract` name and save it to the contracts folder. 
```
hh abi2interface VestingControllerERC721
```
**abi2ipfs** generates an interface file from a `contract` name and uploads it to `IPFS` and pins using Pinata service. It returns the IPFS hash and clickable link. **NOTE: pinata API key is needed in the .env file **
```
hh abi2ipfs VestingControllerERC721
```
**verify** Verifying the contract using Etherscan API. **NOTE: Etherscan API key is needed in the .env file **
```
hh verify <eth_contract_address>
```
**deploy** deploys a contract using the `scripts/deploy_testnet_taks.js` script. It allows for verifying using Etherscan API and initial settings like granting allowance to the VestingController and minting a few sample investments.**NOTE: Etherscan API key is needed in the .env file **
```
hh deploy --verify --initialize
```
**flatten-clean** Flattens files for Etherscan manual single-file verification process.
```
hh flatten-clean contracts/VestingControllerERC721.sol
```
**folder2ipfs** Uploads a complete folder to `IPFS` and pins using Pinata service. It returns the IPFS hash and clickable link. **NOTE: pinata API key is needed in the .env file **
```
hh folder2ipfs uri/sample_to_deploy_ipfs_generated
```
**upgradeProxy** Upgrades a proxy with a new implementation. First it deploys the new implementation and sets the proxy for the new implementation as of OpenZeppelin Upgrades library.
```
hh upgradeProxy <eth_contract_address> VestingControllerERC721
```
**upgradeProxyAndVerify** Upgrades a proxy with a new implementation. First it deploys the new implementation and sets the proxy for the new implementation as of OpenZeppelin Upgrades library. Additionally it also verifies the new implementation using Etherscan API. **NOTE: Etherscan API key is needed in the .env file **
```
hh upgradeProxyAndVerify --verify <eth_contract_address> VestingControllerERC721
```

## RandToken
This contract is the Rand token, a standard OZ ERC20 implementation with upgradability via UUPS OZ Proxy. 
Custom functionality include accessible only the Safety Module:
```
function adminTransfer(
        address owner,
        address recipient,
        uint256 amount
    )
```

## AddressRegistry

Address registry is a simple contract to keep track of the ecosystem contract addresses. It can register a new entity with `setNewAddress(string calldata name, address contractAddress)` and also update an existing entity with the `updateAddress(string calldata name, address contractAddress)`. To fetch the current address for a contract use `getAddress(string calldata name)` and also the `getRegistryList()` function is useful to list the strings stored for the contracts.

In the ecosystem contracts there is a function to update the address of the registry used which can be done on the contracts with `updateRegistryAddress(IAddressRegistry newAddress)`.

### Registry must follow these names based on the current contract implementations:
```
SafetyModuleERC20 = SM
VestingControllerERC721 = VC
RandToken = RND
Governance = GOV
EcosystemReserve = RES
InvestorsNFT = NFT
```

## VestingControllerERC721
It is an OZ ERC721 implementation to hold information about the vesting investors. As an additional function this contract manages the early sale investor NFTs as the ERC721 functionality implements it. 

### Vesting investment functionality
In order to create a new investment the following function is called:
```
function mintNewInvestment(
    address recipient,
    uint256 rndTokenAmount,
    uint256 vestingPeriod,
    uint256 vestingStartTime,
    uint256 cliffPeriod
)
```
This function will mint a new NFT token, and assign a `VestingInvestment` struct to the newly created `tokenId`. It would also emit event `NewInvestmentTokenMinted`.

## Investors NFT (ERC721)
For early investors Rand is gifting a special NFT that is based on the level of the initial investment of the investor. These NFT tokens are held in a separate `ERC721` contract. 

To set the `baseURI` the `setBaseURI(string memory newURI)` must be called e.g: `setBaseURI("ipfs://QmfYu4vZFNRgsnwb8cCnzF4y8ceQfcCMuyj5wm1xT7tre6/")`. This IPFS path must point to a folder containing each of the separate JSON Metadata files for each `tokenId`. 
 **IMPORTANT NOTE**: You must include the ending `/` to the `baseURI` to properly return the `tokenURI`.

The `tokenURI(uint256 tokenId)` is an overriden function as it returns an alternative IPFS address for vesting investment NFT that are deplated (total amount is claimed), so it would show another image for the NFT.

NFT tokens are only transerable when the investment is deplated totally. This is enforced by the override `_transfer()` of the `ERC721`.

Sample IPFS JSON folder:
```
uri/sample_to_deploy_ipfs
├── 1
├── 1_   <--- this is underscore signs the alternative json that is shown when the investment is depleated
├── 2
├── 2_
└── contract_uri
```

Repository contains a `hardhat task`  to automate IPFS uploading for URIs. To use this prepare the folder containing the JSONs, then follow this example:

```
➜  tokenomics git:(Safety-Module-ERC20) ✗ hh folder2ipfs uri/sample_to_deploy_ipfs
/Users/adr/Dev/Rand-Network/tokenomics/uri/sample_to_deploy_ipfs
{
  IpfsHash: 'QmU4JZXUmee8aakZYSqZQVkDjPQALNzXnNPeJMyctUjUoe',
  PinSize: 1551,
  Timestamp: '2022-03-03T14:15:53.872Z',
  isDuplicate: true
}
Successful upload of uri/sample_to_deploy_ipfs to IPFS:
https://cloudflare-ipfs.com/ipfs/QmU4JZXUmee8aakZYSqZQVkDjPQALNzXnNPeJMyctUjUoe
```

## SafetyModuleERC20

The Safety Module (SM) acts as a staking contract to enable Rand token holders to stake their RND and therefore supply shortfall liquidity in case of a bug or hack in the ecosystem contracts. Staking is rewarded in RND tokens with an emission rate from the Ecosystem Reserve Contract.

The staking contract allows users to stake and unstake tokens in exchange for staked RND (sRND). This sRND token represents the share of the user in the SM and is non-transferable in order to disallow dumping in case of a shortfall event. 

When users would like to stake in their tokens, there is the `stake(uint256 amount)` function to do that with a simple and an overloaded version. One is allows with a simple `uint256 amount` to stake in RND tokens without a vesting scheme. The overloaded version requests a `uint256 tokenId` also which defines the vesting investment `tokenId` from the vesting controller. 

In case of unstaking the user must go through a cooldown period first. In order to initiate this must call the `cooldown()` and after the period ends defined by `COOLDOWN_SECONDS` the user need to call the `redeem(uint256 amount)` function. This has also an overloaded version for vesting investors specifying the `tokenId`. After the cooldown period the user has a period for unstaking. After this period of `UNSTAKE_WINDOW` the user must call again the `cooldown()` if wants to unstake.

To claim rewards the user can call the `claimRewards(uint256 amount)` and to simply check the balance of his accrued rewards he can call `calculateTotalRewards(address user)`.

### Updating cooldown and unstake periods
There are two functions to update periods for unstaking:
`updateCooldownPeriod(uint256 newPeriod)` and `updateUnstakePeriod(uint256 newPeriod)`.

### RewardDistributionManager

Rewards are calculated using the scheme applied by Aave Safety Module. This basically calculates an asset level index, and a user level index for the staked asset. Based on an emission rate of the rewards it can be calculated the rewards claimable by the user. 

RewardDistributionManager is inherited by the SafetyModule contract and uses its internal functionality. In order to configure an asset with the `emissionRate` the `updateAsset( address _asset, uint256 _emission, uint256 _totalStaked)` is called.

### BPT Token staking

As Aave does it allows also to stake Balancer Pool Tokens in the Safety Module. It allows for creating and freezing liquidity for the protocol. Another separate contract must be deployed for further assets. Also the applicable functions must be exposed in the contract inheriting.

## Governance

Governance is simple contract to summarize balances from multiple contracts for an account address. It uses the standard `balanceOf` function of `RND` and `SM`, while iterating over all the account holders investment tokens inside `VC` and summarize each individual investment by the following formula:
```
VC balanceOf = rndTokenAmount - rndClaimedAmount - rndStakedAmount
```
Governance contract does not use an ERC20 standard just simply implements the `balanceOf(account)` and `totalSupply()` functions so Automata Witness will be able to query these to calculating governance voting on a DAO proposal.

## Tests

There are two unit test files developed to cover most of the functionality. One is the `test/AddressRegistry.js`, which simply tests the `AddressRegistry` functions separately. The other file is the most complex, which covers all ecosystem contract tests at `test/RND_VC_SM_Gov.js`. 

To run the tests locally using the `hardhat network` simply run:
```
hh test
```

### Deployment utility
To simplify tests there is a short utility script to help deployment, which can also be used as a `hh task`. It is located in `scripts/deploy_testnet_task.js`. It returns the deployed `ethers` contract objects alongside with the default deployment parameters:
```
module.exports = {
  deploy_testnet,
  get_factories,
  get_wallets,
  _RNDdeployParams,
  _VCdeployParams,
  _SMdeployParams,
  _NFTdeployParams,
  _GovDeployParams,
};
```

### Github Actions
These tests are run automatically on the following actions:
```
on:
  push:
    branches:
      - development
      - main

  pull_request:
    branches:
      - development
      - main
```

## .env

Required enviroment variables for hardhat to work
```
MULTISIG_PRIVATE_KEY=
PROXYADMIN_PRIVATE_KEY=
ALICE_PRIVATE_KEY=
BACKEND_PRIVATE_KEY=
MAINNET_URL=
RINKEBY_TESTNET_URL
RINKEBY_ALT
GOERLI_TESTNET_URL=
ROPSTEN_TESTNET_URL=
MOONBEAM_URL=
MOONBASE_URL=
MOONBASE_URL_ALTERNATIVE=
ETHERSCAN_API_KEY=
MOONSCAN_API_KEY=
PINATA_KEY=
PINATA_SECRET=
```