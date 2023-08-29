require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying Registry contract...");
    deployments.log("Deploying contracts with the account:", deployer);

    // Deploying Registry
    const registry = await deploy('AddressRegistry', {
        from: deployer,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize',
                    args: [deployer],
                },
            },
        },
        log: true,
    });

    // Setting addresses
    deployments.log("Setting addresses...");

    const { getParams } = require("./00_deploy_params.js");
    params = await getParams();

    await execute(
        'AddressRegistry',
        { from: deployer },
        'setNewAddress',
        "MS",
        params._RegistryAddressbook._MS
    );

    await execute(
        'AddressRegistry',
        { from: deployer },
        'setNewAddress',
        "OZ",
        params._RegistryAddressbook._OZ
    );

    const AddressRegistry = await ethers.getContractFactory("AddressRegistry");
    const registryInstance = AddressRegistry.attach(registry.address);
    deployments.log("MS:", await registryInstance.getAddressOf("MS"));
    deployments.log("OZ:", await registryInstance.getAddressOf("OZ"));

    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId;
    if (networkId != "31337") {
        await hre.run("etherscan-verify", { contractName: "AddressRegistry" });      // EtherScan verification    
        await hre.run("sourcify", { contractName: "AddressRegistry" });     // Sourcify verification
    };

};

module.exports.tags = ["AddressRegistry"];