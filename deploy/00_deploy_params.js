const { ethers, getNamedAccounts, deployments } = require('hardhat');


async function getParams() {

    const { deployer, alice } = await getNamedAccounts();

    return {

        // Deployment params for initializer
        _RNDdeployParams: {
            _name: "Rand Token",
            _symbol: "RND",
            _initialSupply: BigInt(200e6),
            _decimal: BigInt(6),
            _registry: ""
        },

        _VCdeployParams: {
            _name: "Rand Vesting Controller",
            _symbol: "vestingRND",
            _periodSeconds: 1,
            _registry: ""
        },

        _SMdeployParams: {
            _name: "Staked Rand Token",
            _symbol: "stakedRND",
            _cooldown_seconds: 120, // 604800 7 days
            _unstake_window: 240,
            _registry: ""
        },

        _NFTdeployParams: {
            _name: "Rand NFT",
            _symbol: "nftRND",
            _registry: ""
        },

        _GovDeployParams: {
            _name: "Rand Governance Aggregator",
            _symbol: "govRND",
            _registry: ""
        },

        _RegistryAddressbook: {
            _MS: deployer,
            _MS_Final: alice, //"0x09cD06b1738D9a4568044bA33b60bfdbB9cd7C16",  // Gnosis Safe Mainnet
            _RND: deployer,
            _VCS: deployer, // "0x608b3d5E3cE844faCFF0Be3A9b0D118210AfDcB9",  // OZ Relay Signer
            _SM: deployer,
            _GOV: deployer,
            _RES: alice, //"0xa408C5aeD6021A0FC893532e2CDa3edB035862C6", // Fireblocks Reserves Mainnet
        }
    }
}

module.exports = {
    getParams,
}