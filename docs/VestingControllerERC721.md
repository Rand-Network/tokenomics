# VestingControllerERC721
*Interacts with Rand token and Safety Module (SM)*
Manages the vesting schedules for Rand investors
## initialize

*for upgradability its necessary to use initialize instead of simple constructor*

Initializer allow proxy scheme


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|string|_erc721_name|Name of the token like `Rand Vesting Controller ERC721`|
|input|string|_erc721_symbol|Short symbol like `vRND`|
|input|uint256|_periodSeconds|Amount of seconds to set 1 period to like 60*60*24 for 1 day|
|input|undefined|_registry|is the address of address registry|

## getClaimableTokens

*only accessible by the investor's wallet, the backend address and safety module contract*

View function to get amount of claimable tokens from vested investment token


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|the tokenId for which to query the claimable amount|
|output|uint256|N/A|amounts of tokens an investor is eligible to claim (already vested and unclaimed amount)|

## getInvestmentInfo

*only accessible by the investor's wallet, the backend address and safety module contract*

View function to get information about a vested investment token


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of the token for which to get info|
|output|uint256|rndTokenAmount|vestingStartTime the timestamp when the vesting starts to kick-in|
|output|uint256|rndClaimedAmount|vestingStartTime the timestamp when the vesting starts to kick-in|
|output|uint256|vestingPeriod|vestingStartTime the timestamp when the vesting starts to kick-in|
|output|uint256|vestingStartTime|vestingStartTime the timestamp when the vesting starts to kick-in|
|output|uint256|rndStakedAmount|vestingStartTime the timestamp when the vesting starts to kick-in|

## getInvestmentInfoForNFT

*only accessible by the investors NFT contract*

View function to get information about a vested investment token exclusively for the Investors NFT contract


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|nftTokenId|is the id of the token for which to get info|
|output|uint256|rndTokenAmount|rndClaimedAmount amounts of tokens an investor already claimed and received|
|output|uint256|rndClaimedAmount|rndClaimedAmount amounts of tokens an investor already claimed and received|

## claimTokens

*emits ClaimedAmount() and only accessible by the investor's wallet, the backend address and safety module contract*

Claim function to withdraw vested tokens


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of investment to submit the claim on|
|input|uint256|amount|is the amount of vested tokens to claim in the process|

## _addClaimedTokens

*internal function only called by the claimTokens() function*

Adds claimed amount to the investments


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|is the amount of vested tokens to claim in the process|
|input|uint256|tokenId|is the id of investment to submit the claim on|

## _calculateClaimableTokens

*internal function only called by the claimTokens() function*

Calculates the claimable amount as of now for a tokenId


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|is the id of investment to submit the claim on|
|output|uint256|claimableAmount|N/A|

## mintNewInvestment

*emits NewInvestmentTokenMinted() and only accessible with MINTER_ROLE*

Mints a token and associates an investment to it and sets tokenURI


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|recipient|is the address to whom the investment token should be minted to|
|input|uint256|rndTokenAmount|is the amount of the total investment|
|input|uint256|vestingPeriod|number of periods the investment is vested for|
|input|uint256|vestingStartTime|the timestamp when the vesting starts to kick-in|
|input|uint256|cliffPeriod|is the number of periods the vestingStartTime is shifted by|
|output|uint256|tokenId|tokenId the id of the minted token on VC|

## mintNewInvestment

*emits NewInvestmentTokenMinted() and only accessible with MINTER_ROLE*

Mints a token and associates an investment to it and sets tokenURI and also mints an investors NFT


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|recipient|is the address to whom the investment token should be minted to|
|input|uint256|rndTokenAmount|is the amount of the total investment|
|input|uint256|vestingPeriod|number of periods the investment is vested for|
|input|uint256|vestingStartTime|the timestamp when the vesting starts to kick-in|
|input|uint256|cliffPeriod|is the number of periods the vestingStartTime is shifted by|
|input|uint256|nftTokenId|is the tokenId to be used on the investors NFT when minting|
|output|uint256|tokenId|tokenId the id of the minted token on VC|

## _mintNewInvestment

## distributeTokens

*emits InvestmentTransferred() and only accessible with MINTER_ROLE*

Transfers RND Tokens to non-vesting investor, its used to distribute public sale tokens by backend


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|recipient|is the address to whom the token should be transferred to|
|input|uint256|rndTokenAmount|is the amount of the total investment|

## transferRNDFromVC

*emits RNDTransferred() and only accessible with SM_ROLE*

Transfers RND Tokens to an address in order to get funds for SM or release tokens stuck on VC


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|address|recipient|is the address to whom the token should be transferred to|
|input|uint256|rndTokenAmount|is the amount of the total investment|

## modifyStakedAmount

*emits StakedAmountModifier() and only accessible by the Safety Module contract via SM_ROLE*

Function for Safety Module to increase the staked RND amount


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenId|the tokenId for which to increase staked amount|
|input|uint256|amount|the amount of tokens to increase staked amount|

## _getRND

*emit FetchedRND(), needs allowance from MultiSig on initial RND supply*

Function which allows VC to pull RND funds when minting an investment


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|amount|of tokens to fetch from the Rand Multisig when minting a new investment|
|output|bool|N/A|bool|

## updateRegistryAddress

*emits RegistryAddressUpdated() and only accessible by MultiSig*

Function to let Rand to update the address of the Safety Module


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|undefined|newAddress|where the new Safety Module contract is located|

## getTokenIdOfNFT

Simple utility function to get investent tokenId based on an NFT tokenId


|Input/Output|Data Type|Variable Name|Comment|
|----------|----------|----------|----------|
|input|uint256|tokenIdNFT|tokenId of the early investor NFT|
|output|uint256|tokenId|tokenId of the investment|

## pause

## unpause

## _safeMint

## _beforeTokenTransfer

## burn

## _burn

## _transfer

## supportsInterface

## _authorizeUpgrade

