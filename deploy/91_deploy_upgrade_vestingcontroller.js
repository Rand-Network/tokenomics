require('hardhat-deploy');
const { getUUPSImplementationAddress } = require("../test/utils");

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();

    // Run fixture to deploy the contracts
    await deployments.fixture(['VestingControllerERC721']);

    // Get VC contract
    const VestingControllerDeployment = await deployments.get("VestingControllerERC721");
    const VestingControllerContract = await ethers.getContractFactory("VestingControllerERC721");
    VestingController = await VestingControllerContract.attach(VestingControllerDeployment.address);

    // Deploying V2
    const vc_v2 = await deploy('VestingControllerERC721_V2', {
        from: deployer,
        proxy: false,
        log: true,
    });

    // Log current proxy and implementation and V2 addresses
    console.log("Proxy address:                     ", VestingControllerDeployment.address);
    console.log("V1 implementation address:         ", VestingControllerDeployment.implementation);
    console.log("V2 implementation address:         ", vc_v2.address);

    // Upgrade the existing proxy to the new implementation
    if (hre.network.config.chainId == "31337") {
        // Upgrade proxy
        tx = await VestingController.upgradeTo(vc_v2.address, { from: deployer });

        // Mine a single block
        await hre.network.provider.send("evm_mine");

        // Get the new proxy implementation address
        const vc_upgraded = await getUUPSImplementationAddress(VestingControllerDeployment);

        // Log new proxy and implementation addresses
        console.log("Proxy V2 implementation address:   ", vc_upgraded);
    }

    // Verifying contracts if not on local network
    if (hre.network.config.chainId != "31337") {
        await hre.run("etherscan-verify", { address: vc_v2.address }); // EtherScan verification
        await hre.run("verify-proxy", { proxy: vc_v2.address, implementation: vc.implementation }); // OpenZeppelin proxy verification
        await hre.run("sourcify", { address: vc_v2.address });   // Sourcify verification
    };

};

module.exports.tags = ["VestingControllerERC721_Upgraded"];