# InvestorsNFT
*Interacts with Rand VestingController*
Holds NFTs for early investors
## initialize

*for upgradability its necessary to use initialize instead of simple constructor*

Initializer allow proxy scheme


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|_erc721_name|Name of the token like `Rand Vesting Controller ERC721`|
|input|string|_erc721_symbol|Short symbol like `vRND`|
|input|undefined|_registry|is the address of address registry|

## updateRegistryAddress

*emits RegistryAddressUpdated() and only accessible by MultiSig*

Function to let Rand to update the address of the Safety Module


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|undefined|newAddress|where the new Safety Module contract is located|

## pause

## unpause

## mintInvestmentNFT

## _beforeTokenTransfer

## burn

## _burn

## _transfer

## setBaseURI

## _baseURI

## tokenURI

## contractURI

## supportsInterface

## _authorizeUpgrade

