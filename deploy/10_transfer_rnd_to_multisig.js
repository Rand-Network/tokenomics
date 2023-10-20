require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying InvestorNFT contract...");
    deployments.log("Deploying contracts with the account:", deployer);

    const { getParams } = require("./00_deploy_params.js");
    params = await getParams();
    multisig = params._RegistryAddressbook._MS_Final;
    amount = params._RNDdeployParams._initialSupply * BigInt(10) ** params._RNDdeployParams._decimal;

    // Transfer RND from deployer to MultiSig
    // Setting token address in AddressRegistry
    tx = await execute(
        'RandToken',
        { from: deployer },
        'transfer',
        multisig,
        amount
    );

    console.log("Transfered", amount, "RND to", multisig);
    console.log("Tx:", tx.transactionHash);


};

module.exports.tags = ["TransferRND"];
module.exports.dependencies = ["RandToken", "MigrateRoles"];