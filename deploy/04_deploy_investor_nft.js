require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying InvestorNFT contract...");
    deployments.log("Deploying contracts with the account:", deployer);

    // Setting deploy parameters
    registry = await deployments.get("AddressRegistry");
    const { getParams } = require("./00_deploy_params.js");
    params = await getParams();
    params._NFTdeployParams._registry = registry.address;

    const nft = await deploy('InvestorsNFT', {
        from: deployer,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize',
                    args: Object.values(params._NFTdeployParams),
                },
            },
        },
        log: true,
    });


    // Setting vc address in AddressRegistry
    await execute(
        'AddressRegistry',
        { from: deployer },
        'setNewAddress',
        "NFT",
        nft.address
    );

    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId

    if (networkId != "31337") {
        await hre.run("etherscan-verify", { contractName: "InvestorsNFT" }); // EtherScan verification
        await hre.run("sourcify", { contractName: "InvestorsNFT" });   // Sourcify verification
    };
};

module.exports.tags = ["InvestorsNFT"];
module.exports.dependencies = ["AddressRegistry"];