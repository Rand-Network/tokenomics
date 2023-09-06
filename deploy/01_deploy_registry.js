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
        "VCS",
        params._RegistryAddressbook._VCS
    );

    await execute(
        'AddressRegistry',
        { from: deployer },
        'setNewAddress',
        "SM",
        params._RegistryAddressbook._SM
    );

    await execute(
        'AddressRegistry',
        { from: deployer },
        'setNewAddress',
        "GOV",
        params._RegistryAddressbook._GOV
    );


    const AddressRegistry = await ethers.getContractFactory("AddressRegistry");
    const registryInstance = AddressRegistry.attach(registry.address);
    deployments.log("MS  address:", await registryInstance.getAddressOf("MS"));
    deployments.log("VCS address:", await registryInstance.getAddressOf("VCS"));
    deployments.log("SM  address:", await registryInstance.getAddressOf("SM"));
    deployments.log("GOV address:", await registryInstance.getAddressOf("GOV"));


    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId;
    if (networkId != "31337") {
        await hre.run("etherscan-verify", { address: registry.address });      // EtherScan verification    
        await hre.run("sourcify", { contractName: "AddressRegistry" });     // Sourcify verification
    };

};

module.exports.tags = ["AddressRegistry"];