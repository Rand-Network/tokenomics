require('hardhat-deploy');
const { ethers, getNamedAccounts, deployments } = require('hardhat');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying SigTest contract...");
    deployments.log("Deploying contracts with the account:", deployer);

    const signers = await ethers.getSigners();
    deployer_signer = signers[0];
    alice = signers[1];

    // Setting deploy parameters
    const sigtest = await deploy('SigTest', {
        from: deployer,
        log: true,
    });

};

module.exports.tags = ['SigTest'];
module.exports.dependencies = ['AddressRegistry'];