# Rand Tokenomics

This repository stores the tokenomics ecosystem related contracts, scripts and test for Rand Network.

These contracts are the following:
- Rand Token contract (RND) ERC20
- Vesting Controller (VC) ERC721
- Safety Module (SM) ERC20
- Governance (rDAO) 

## Hardhat

To run the repository test follow these steps:
```
npm install .
npx hardhat node &
npx hardhat test
```

## RandToken
This contract is the Rand token, a standard OZ ERC20 implementation with upgradability via UUPS OZ Proxy. 
Custom functionality include:
```
setAllowanceForSM(address staker, uint256 amount)
function approveAndTransfer(
        address owner,
        address recipient,
        uint256 amount
    )
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