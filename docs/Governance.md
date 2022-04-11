# Governance
Default implementation of the OpenZeppelin ERC20 standard by overriding balanceOf() and totalSupply() and disallow token transfers
## initialize

*For upgradability its necessary to use initialize instead of simple constructor*

Initializer allow proxy scheme


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|_name|Name of the token like `Rand Governance Aggregator ERC20`|
|input|string|_symbol|Short symbol like `gRND`|
|input|undefined|_registry|is the address of address registry|

## updateRegistryAddress

*emits RegistryAddressUpdated() and only accessible by MultiSig*

Function to let Rand to update the address of the Safety Module


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|undefined|newAddress|where the new Safety Module contract is located|

## totalSupply

Function to override default totalSupply and point it to the totalSupply of RND token contract


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|output|uint256|N/A|N/A|

## balanceOf

Function to summarize balances of an account over multiple Rand Ecosystem tokens


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|account|to summarize balance for in VC, SM and RND|
|output|uint256|N/A|N/A|

## name

## symbol

## decimals

## pause

## unpause

## _authorizeUpgrade

