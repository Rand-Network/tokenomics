require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying Randtoken contract...");
    deployments.log("Deploying contracts with the account:", deployer);


    // Setting deploy parameters
    registry = await deployments.get("AddressRegistry");
    const { getParams } = require("./00_deploy_params.js");
    params = await getParams();
    params._RNDdeployParams._registry = registry.address;

    // Deploy RandToken contract
    const token = await deploy('RandToken', {
        from: deployer,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize',
                    args: Object.values(params._RNDdeployParams),
                },
            },
        },
        log: true,
    });

    // Setting token address in AddressRegistry
    await execute(
        'AddressRegistry',
        { from: deployer },
        'setNewAddress',
        "RND",
        token.address
    );

    const AddressRegistry = await ethers.getContractFactory("AddressRegistry");
    const registryInstance = AddressRegistry.attach(registry.address);
    deployments.log("RND:", await registryInstance.getAddressOf("RND"));

    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId;
    if (networkId != "31337") {
        await hre.run("etherscan-verify", { address: token.address }); // EtherScan verification
        await hre.run("sourcify", { contractName: "RandToken" });   // Sourcify verification
    };

};

module.exports.tags = ["RandToken"];
module.exports.dependencies = ["AddressRegistry"];