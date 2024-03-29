# VestingControllerERC721_V2





VC1: No access role for this address VC2: Not accessible by msg.sender VC3: Signature invalid VC4: tokenId does not exist VC5: Only Investors NFT allowed to call VC6: nftTokenId does not exist VC7: Amount is more than claimable VC8: Amount to be claimed is more than remaining VC9: Recipient cannot be zero address VC10: Amount must be more than zero VC11: Transfer of token is prohibited until investment is totally claimed



## Methods

### DEFAULT_ADMIN_ROLE

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### MINTER_ROLE

```solidity
function MINTER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### PAUSER_ROLE

```solidity
function PAUSER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### PERIOD_SECONDS

```solidity
function PERIOD_SECONDS() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### READER_ROLE

```solidity
function READER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### REGISTRY

```solidity
function REGISTRY() external view returns (contract IAddressRegistry)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IAddressRegistry | undefined |

### approve

```solidity
function approve(address to, uint256 tokenId) external nonpayable
```



*See {IERC721-approve}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| tokenId | uint256 | undefined |

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```



*See {IERC721-balanceOf}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### baseURI

```solidity
function baseURI() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### burn

```solidity
function burn(uint256 tokenId) external nonpayable
```

Burn vesting token by admin (avaiable only for DEFAULT_ADMIN_ROLE)

*Returns collateral tokens to the caller*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | to be burned |

### claimTokens

```solidity
function claimTokens(uint256 tokenId, uint256 amount) external nonpayable
```

Claim function to withdraw vested tokens

*emits ClaimedAmount() and only accessible by the investor&#39;s wallet, the backend address and safety module contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | is the id of investment to submit the claim on |
| amount | uint256 | is the amount of vested tokens to claim in the process |

### distributeTokens

```solidity
function distributeTokens(bytes signature, uint256 signatureTimestamp, address recipient, uint256 rndTokenAmount) external nonpayable
```

Transfers RND Tokens to non-vesting investor, its used to distribute public sale tokens by backend

*emits InvestmentTransferred() and only accessible with signature from Rand*

#### Parameters

| Name | Type | Description |
|---|---|---|
| signature | bytes | undefined |
| signatureTimestamp | uint256 | undefined |
| recipient | address | is the address to whom the token should be transferred to |
| rndTokenAmount | uint256 | is the amount of the total investment |

### getApproved

```solidity
function getApproved(uint256 tokenId) external view returns (address)
```



*See {IERC721-getApproved}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### getClaimableTokens

```solidity
function getClaimableTokens(uint256 tokenId) external view returns (uint256)
```

View function to get amount of claimable tokens from vested investment token

*only accessible by the investor&#39;s wallet, the backend address and safety module contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | the tokenId for which to query the claimable amount |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | amounts of tokens an investor is eligible to claim (already vested and unclaimed amount) |

### getInvestmentInfo

```solidity
function getInvestmentInfo(uint256 tokenId) external view returns (uint256 rndTokenAmount, uint256 rndClaimedAmount, uint256 vestingPeriod, uint256 vestingStartTime, uint256 rndStakedAmount)
```

View function to get information about a vested investment token

*only accessible by the investor&#39;s wallet, the backend address and safety module contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | is the id of the token for which to get info |

#### Returns

| Name | Type | Description |
|---|---|---|
| rndTokenAmount | uint256 | is the amount of the total investment |
| rndClaimedAmount | uint256 | amounts of tokens an investor already claimed and received |
| vestingPeriod | uint256 | number of periods the investment is vested for |
| vestingStartTime | uint256 | the timestamp when the vesting starts to kick-in |
| rndStakedAmount | uint256 | the amount of tokens an investor is staking |

### getInvestmentInfoForNFT

```solidity
function getInvestmentInfoForNFT(uint256 nftTokenId) external view returns (uint256 rndTokenAmount, uint256 rndClaimedAmount)
```

View function to get information about a vested investment token exclusively for the Investors NFT contract

*only accessible by the investors NFT contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| nftTokenId | uint256 | is the id of the token for which to get info |

#### Returns

| Name | Type | Description |
|---|---|---|
| rndTokenAmount | uint256 | is the amount of the total investment |
| rndClaimedAmount | uint256 | amounts of tokens an investor already claimed and received |

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```



*Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role&#39;s admin, use {_setRoleAdmin}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### getTokenIdOfNFT

```solidity
function getTokenIdOfNFT(uint256 tokenIdNFT) external view returns (uint256 tokenId)
```

Simple utility function to get investment tokenId based on an NFT tokenId



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenIdNFT | uint256 | tokenId of the early investor NFT |

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | of the investment |

### grantRole

```solidity
function grantRole(bytes32 role, address account) external nonpayable
```



*Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements: - the caller must have ``role``&#39;s admin role. May emit a {RoleGranted} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```



*Returns `true` if `account` has been granted `role`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### initialize

```solidity
function initialize(string _erc721_name, string _erc721_symbol, uint256 _periodSeconds, contract IAddressRegistry _registry) external nonpayable
```

Initializer allow proxy scheme

*for upgradability its necessary to use initialize instead of simple constructor*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _erc721_name | string | Name of the token like `Rand Vesting Controller ERC721` |
| _erc721_symbol | string | Short symbol like `vRND` |
| _periodSeconds | uint256 | Amount of seconds to set 1 period to like 60*60*24 for 1 day |
| _registry | contract IAddressRegistry | is the address of address registry |

### isApprovedForAll

```solidity
function isApprovedForAll(address owner, address operator) external view returns (bool)
```



*See {IERC721-isApprovedForAll}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| operator | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### mintNewInvestment

```solidity
function mintNewInvestment(bytes signature, uint256 signatureTimestamp, VestingControllerERC721_V2.MintParameters params, uint8 nftLevel) external nonpayable returns (uint256 tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| signature | bytes | undefined |
| signatureTimestamp | uint256 | undefined |
| params | VestingControllerERC721_V2.MintParameters | undefined |
| nftLevel | uint8 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined |

### modifyStakedAmount

```solidity
function modifyStakedAmount(uint256 tokenId, uint256 amount) external nonpayable
```

Function for Safety Module to increase the staked RND amount

*emits StakedAmountModifier() and only accessible by the Safety Module contract via SM_ROLE*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | the tokenId for which to increase staked amount |
| amount | uint256 | the amount of tokens to increase staked amount |

### name

```solidity
function name() external view returns (string)
```



*See {IERC721Metadata-name}.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### ownerOf

```solidity
function ownerOf(uint256 tokenId) external view returns (address)
```



*See {IERC721-ownerOf}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### pause

```solidity
function pause() external nonpayable
```






### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```



*Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation&#39;s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined |

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function&#39;s purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the caller must be `account`. May emit a {RoleRevoked} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the caller must have ``role``&#39;s admin role. May emit a {RoleRevoked} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined |
| account | address | undefined |

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId) external nonpayable
```



*See {IERC721-safeTransferFrom}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| tokenId | uint256 | undefined |

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external nonpayable
```



*See {IERC721-safeTransferFrom}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| tokenId | uint256 | undefined |
| data | bytes | undefined |

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) external nonpayable
```



*See {IERC721-setApprovalForAll}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | undefined |
| approved | bool | undefined |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### symbol

```solidity
function symbol() external view returns (string)
```



*See {IERC721Metadata-symbol}.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### tokenByIndex

```solidity
function tokenByIndex(uint256 index) external view returns (uint256)
```



*See {IERC721Enumerable-tokenByIndex}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| index | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### tokenOfOwnerByIndex

```solidity
function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)
```



*See {IERC721Enumerable-tokenOfOwnerByIndex}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| index | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### tokenURI

```solidity
function tokenURI(uint256 tokenId) external view returns (string)
```



*See {IERC721Metadata-tokenURI}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```



*See {IERC721Enumerable-totalSupply}.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 tokenId) external nonpayable
```



*See {IERC721-transferFrom}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| tokenId | uint256 | undefined |

### unpause

```solidity
function unpause() external nonpayable
```






### updateRegistryAddress

```solidity
function updateRegistryAddress(contract IAddressRegistry newAddress) external nonpayable
```

Function to let Rand to update the address of the Safety Module

*emits RegistryAddressUpdated() and only accessible by MultiSig*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress | contract IAddressRegistry | where the new Safety Module contract is located |

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external nonpayable
```



*Upgrade the implementation of the proxy to `newImplementation`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```



*Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {_authorizeUpgrade}. Emits an {Upgraded} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newImplementation | address | undefined |
| data | bytes | undefined |



## Events

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousAdmin  | address | undefined |
| newAdmin  | address | undefined |

### Approval

```solidity
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| approved `indexed` | address | undefined |
| tokenId `indexed` | uint256 | undefined |

### ApprovalForAll

```solidity
event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| operator `indexed` | address | undefined |
| approved  | bool | undefined |

### BaseURIChanged

```solidity
event BaseURIChanged(string baseURI)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| baseURI  | string | undefined |

### BeaconUpgraded

```solidity
event BeaconUpgraded(address indexed beacon)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| beacon `indexed` | address | undefined |

### ClaimedAmount

```solidity
event ClaimedAmount(uint256 tokenId, address recipient, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId  | uint256 | undefined |
| recipient  | address | undefined |
| amount  | uint256 | undefined |

### ContractURIChanged

```solidity
event ContractURIChanged(string contractURI)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| contractURI  | string | undefined |

### FetchedRND

```solidity
event FetchedRND(uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount  | uint256 | undefined |

### Initialized

```solidity
event Initialized(uint8 version)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint8 | undefined |

### InvestmentTransferred

```solidity
event InvestmentTransferred(address recipient, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| amount  | uint256 | undefined |

### NewInvestmentTokenMinted

```solidity
event NewInvestmentTokenMinted(VestingControllerERC721_V2.VestingInvestment investment, uint256 tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| investment  | VestingControllerERC721_V2.VestingInvestment | undefined |
| tokenId  | uint256 | undefined |

### NewInvestmentTokenMintedWithNFT

```solidity
event NewInvestmentTokenMintedWithNFT(uint256 nftTokenId, uint256 tokenId, uint8 nftLevel)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| nftTokenId  | uint256 | undefined |
| tokenId  | uint256 | undefined |
| nftLevel  | uint8 | undefined |

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### RNDTransferred

```solidity
event RNDTransferred(address recipient, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| recipient  | address | undefined |
| amount  | uint256 | undefined |

### RegistryAddressUpdated

```solidity
event RegistryAddressUpdated(contract IAddressRegistry newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress  | contract IAddressRegistry | undefined |

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| previousAdminRole `indexed` | bytes32 | undefined |
| newAdminRole `indexed` | bytes32 | undefined |

### RoleGranted

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### RoleRevoked

```solidity
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### SignatureUsed

```solidity
event SignatureUsed(address sender, address recipient, uint256 rndAmount, uint256 vestingStartTime, uint256 vestingPeriod, uint256 cliffPeriod, uint8 nftLevel, uint256 timestamp, uint256 chainId, bytes signature)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender  | address | undefined |
| recipient  | address | undefined |
| rndAmount  | uint256 | undefined |
| vestingStartTime  | uint256 | undefined |
| vestingPeriod  | uint256 | undefined |
| cliffPeriod  | uint256 | undefined |
| nftLevel  | uint8 | undefined |
| timestamp  | uint256 | undefined |
| chainId  | uint256 | undefined |
| signature  | bytes | undefined |

### StakedAmountModified

```solidity
event StakedAmountModified(uint256 tokenId, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId  | uint256 | undefined |
| amount  | uint256 | undefined |

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| tokenId `indexed` | uint256 | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| implementation `indexed` | address | undefined |



