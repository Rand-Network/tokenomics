require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying VestingController contract...");
    deployments.log("Deploying contracts with the account:", deployer);


    // Setting deploy parameters
    registry = await deployments.get("AddressRegistry");
    const { getParams } = require("./00_deploy_params.js");
    params = await getParams();
    params._VCdeployParams._registry = registry.address;

    const vc = await deploy('VestingControllerERC721', {
        from: deployer,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize',
                    args: Object.values(params._VCdeployParams),
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
        "VC",
        vc.address
    );

    const AddressRegistry = await ethers.getContractFactory("AddressRegistry");
    const registryInstance = AddressRegistry.attach(registry.address);
    deployments.log("VC:", await registryInstance.getAddressOf("VC"));

    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId
    if (networkId != "31337") {
        await hre.run("etherscan-verify", { address: vc.address }); // EtherScan verification
        await hre.run("sourcify", { contractName: "VestingControllerERC721" });   // Sourcify verification
    };
};

module.exports.tags = ["VestingControllerERC721"];
module.exports.dependencies = ["AddressRegistry"];