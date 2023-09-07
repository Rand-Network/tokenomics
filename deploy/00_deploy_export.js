require('hardhat-deploy');
const EtherscanChainConfig = require('../scripts/utils_etherscan_config.js');
const utils_export_csv = require('../scripts/utils_export_csv.js');
const { getParams } = require('./00_deploy_params.js');


module.exports = async function (hre) {

    // Load contracts from deployments
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute, } = deployments;
    const { deployer } = await getNamedAccounts();

    // Load deployments
    const registry = await deployments.get("AddressRegistry");
    const token = await deployments.get("RandToken");
    const vc = await deployments.get("VestingControllerERC721");
    const nft = await deployments.get("InvestorsNFT");


    // Loop over EtherscanChainConfig and find the corresponding key name inside chain based on chanId
    const gotNetwork = await ethers.provider.getNetwork();
    const chainId = gotNetwork.chainId;
    for (var key in EtherscanChainConfig.chains) {
        var obj = EtherscanChainConfig.chains[key];
        if (obj.chainId == chainId) {
            var network_name = key;
            var explorer_url = EtherscanChainConfig.chains[key].urls.browserURL + '/address/';
        }
    }

    // Exit if network is not supported
    // if (network_name == undefined || network_name == "hardhat" || network_name == "development") {
    //     console.log("Deployment on local network. No need to export addresses. Exiting...");
    //     //process.exit(1);
    // }

    // Get Github latest commit on current branch
    var revision = require('child_process').execSync('git rev-parse HEAD').toString().trim();
    revision = `https://github.com/Rand-Network/tokenomics/commit/${revision}`;

    // Get environment 
    params = await getParams();
    var name_prefix = params._RNDdeployParams._name
    const environment = (name_prefix.includes('Rand')) ? "Production" : "Development";

    // Create array with deployed addresses
    const deployed_addresses = [
        {
            name: "Registry",
            address: registry.address,
            commit_hash: revision,
            environment: environment,
            implementation: registry.implementation,
            network_name: network_name,
            explorer: explorer_url + registry.address
        },
        {
            name: "Token",
            address: token.address,
            commit_hash: revision,
            environment: environment,
            implementation: token.implementation,
            network_name: network_name,
            explorer: explorer_url + token.address
        },
        {
            name: "Vesting Controller",
            address: vc.address,
            commit_hash: revision,
            environment: environment,
            implementation: vc.implementation,
            network_name: network_name,
            explorer: explorer_url + vc.address
        },
        {
            name: "InvestorsNFT",
            address: nft.address,
            commit_hash: revision,
            environment: environment,
            implementation: nft.implementation,
            network_name: network_name,
            explorer: explorer_url + nft.address
        }
    ];

    // Print deployed addresses
    console.log("Deployed addresses:");
    console.table(deployed_addresses);

    // Get current timestamp for file name with format: YYYY-MM-DD-HH-MM-SS
    var current_timestamp = new Date().toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-');

    // Export deployed addresses to CSV file
    await utils_export_csv.export_csv_data(deployed_addresses, `./deployed_addresses_${network_name}_${environment}_${current_timestamp}.csv`);
    process.exit(1);

};

module.exports.tags = ["Export"];
