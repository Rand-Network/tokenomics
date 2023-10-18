require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();

    // Get box contract
    const box = await deployments.get('Box');

    // Deploying Registry
    const boxV2 = await deploy('BoxV2', {
        from: deployer,
        proxy: false,
        log: true,
    });

    // Upgrade the existing proxy to the new implementation
    await execute(
        'Box',
        { from: deployer, log: true },
        'upgradeTo',
        boxV2.address
    );

    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId;
    if (networkId != "31337") {
        await hre.run("etherscan-verify", { address: box.address, implementation: boxV2.implementation });   // EtherScan verification    
        await hre.run("sourcify", { address: boxV2.address });     // Sourcify verification
    };

};

module.exports.tags = ["BoxV2"];