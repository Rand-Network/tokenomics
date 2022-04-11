# AddressRegistry
*Functionality integrated into all ecosystem contracts*
Stores addresses for ecosystem contracts
## initialize

## getRegistryList

Returns all the stored contract names in strings


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|output|undefined|N/A|an array of strings|

## getAddress

Returns the current address for a contract located in the ecosystem


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|name|is the string name of the contract|
|output|address|contractAddress|contractAddress is the address of the input name contract|

## getAllAddress

Useful to query all the addresses used for a contract


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|name|is the string name of the contract|
|output|undefined|N/A|an array of addresses of the contract|

## updateAddress

Used to update the latest address for a contract


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|name|is the string name of the contract|
|input|address|contractAddress|is the new address to set for a contract|

## setNewAddress

Used to register a new address in the registry


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|name|is the string name of the contract|
|input|address|contractAddress|is the new address to set for a contract|
|output|bool|N/A|true if successful, false if already exists|

## _existInArray

## pause

## unpause

## _authorizeUpgrade

