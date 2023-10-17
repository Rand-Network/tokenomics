require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();

    // Deploying Registry
    const box = await deploy('BoxV2', {
        from: deployer,
        proxy: {
            proxyContract: 'UUPS',
            execute: {
                init: {
                    methodName: 'initialize',
                    args: [BigInt(1)],
                },
            },
        },
        log: true,
    });

    // Verifying contracts if not on local network
    const networkId = await hre.network.config.chainId;
    if (networkId != "31337") {
        await hre.run("etherscan-verify", { address: box.address });   // EtherScan verification    
        await hre.run("sourcify", { address: box.address });     // Sourcify verification
    };

};

module.exports.tags = ["BoxV2"];