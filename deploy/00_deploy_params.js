const { ethers, getNamedAccounts, deployments } = require('hardhat');


async function getParams() {

    const { deployer, alice } = await getNamedAccounts();

    return {

        // Deployment params for initializer
        _RNDdeployParams: {
            _name: "Token ERC20",
            _symbol: "tRND",
            _initialSupply: BigInt(200e6),
            _decimal: BigInt(6),
            _registry: ""
        },

        _VCdeployParams: {
            _name: "Vesting Controller ERC721",
            _symbol: "tvRND",
            _periodSeconds: 1,
            _registry: ""
        },

        _SMdeployParams: {
            _name: "Staked Token",
            _symbol: "tsRND",
            _cooldown_seconds: 120, // 604800 7 days
            _unstake_window: 240,
            _registry: ""
        },

        _NFTdeployParams: {
            _name: "Early Investors NFT",
            _symbol: "tNFT",
            _registry: ""
        },

        _GovDeployParams: {
            _name: "Governance Aggregator",
            _symbol: "gRND",
            _registry: ""
        },

        _RegistryAddressbook: {
            _MS: deployer,
            _MS_Final: "0x666C7D52AFa2dF4C9723dbC44ee1A8A96A5A6dB6",
            _RND: deployer,
            _VCS: deployer,
            _SM: deployer,
            _GOV: deployer,
            _RES: "0xC25ceA6E0cbC0986F13Cf91171f5ECF19B63e28d",
        }
    }
}

module.exports = {
    getParams,
}