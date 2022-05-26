# RandToken
Default implementation of the OpenZeppelin ERC20 standard to be used for the RND token
## initialize

*For upgradability its necessary to use initialize instead of simple constructor*

Initializer allow proxy scheme


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|_name|Name of the token like `Rand Token ERC20`|
|input|string|_symbol|Short symbol like `RND`|
|input|uint256|_initialSupply|Total supply to mint initially like `200e6`|
|input|undefined|_registry|is the address of address registry|

## adminTransfer

*Aims to allow simple UX*

Function to allow Safety Module to move funds without multiple approve and transfer steps


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|owner|is the address who's tokens are approved and transferred|
|input|address|recipient|is the address where to transfer the funds|
|input|uint256|amount|is the amount of transfer|

## updateRegistryAddress

*emits RegistryAddressUpdated() and only accessible by MultiSig*

Function to let Rand to update the address of the Safety Module


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|undefined|newAddress|where the new Safety Module contract is located|

## pause

## unpause

## mint

## burn

## _beforeTokenTransfer


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|from||
|input|address|to||
|input|uint256|amount||

## _authorizeUpgrade

