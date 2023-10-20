require('hardhat-deploy');

module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy, execute } = deployments;
    const { deployer } = await getNamedAccounts();
    deployments.log("Deploying InvestorNFT contract...");
    deployments.log("Deploying contracts with the account:", deployer);

    // Setting deploy parameters
    // Fetch deployments
    const AddressRegistryDeployment = await deployments.get("AddressRegistry");
    const AddressRegistryContract = await ethers.getContractFactory("AddressRegistry");
    RandRegistry = AddressRegistryContract.attach(AddressRegistryDeployment.address);

    const RandTokenDeployment = await deployments.get("RandToken");
    const RandTokenContract = await ethers.getContractFactory("RandToken");
    RandToken = RandTokenContract.attach(RandTokenDeployment.address);

    const VestingControllerDeployment = await deployments.get("VestingControllerERC721");
    const VestingControllerContract = await ethers.getContractFactory("VestingControllerERC721");
    RandVC = VestingControllerContract.attach(VestingControllerDeployment.address);

    const InvestorsNFTDeployment = await deployments.get("InvestorsNFT");
    const InvestorsNFTContract = await ethers.getContractFactory("InvestorsNFT");
    RandNFT = InvestorsNFTContract.attach(InvestorsNFTDeployment.address);

    const { getParams } = require("./00_deploy_params.js");
    params = await getParams();
    multisig = params._RegistryAddressbook._MS_Final;

    // Get each role used in tokenomics
    const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await RandToken.MINTER_ROLE();
    const PAUSER_ROLE = await RandToken.PAUSER_ROLE();

    // Set roles for each contract
    // RND Token
    await RandToken.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandToken.grantRole(MINTER_ROLE, multisig);
    await RandToken.grantRole(PAUSER_ROLE, multisig);
    await RandToken.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
    await RandToken.renounceRole(MINTER_ROLE, deployer);
    await RandToken.renounceRole(PAUSER_ROLE, deployer);
    // VC Token
    await RandVC.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandVC.grantRole(MINTER_ROLE, multisig);
    await RandVC.grantRole(PAUSER_ROLE, multisig);
    await RandVC.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
    await RandVC.renounceRole(MINTER_ROLE, deployer);
    await RandVC.renounceRole(PAUSER_ROLE, deployer);
    // NFT Token
    await RandNFT.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandNFT.grantRole(MINTER_ROLE, multisig);
    await RandNFT.grantRole(PAUSER_ROLE, multisig);
    await RandNFT.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
    await RandNFT.renounceRole(MINTER_ROLE, deployer);
    await RandNFT.renounceRole(PAUSER_ROLE, deployer);

    // Registry update MultiSig MS 
    await RandRegistry.updateAddress("MS", multisig);
    await RandRegistry.updateAddress("GOV", multisig);
    await RandRegistry.updateAddress("SM", multisig);

    // Registry
    await RandRegistry.grantRole(DEFAULT_ADMIN_ROLE, multisig);
    await RandRegistry.grantRole(PAUSER_ROLE, multisig);
    await RandRegistry.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
    tx = await RandRegistry.renounceRole(PAUSER_ROLE, deployer);
    await tx.wait(1);

    console.log('\nRandToken');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandToken.hasRole(DEFAULT_ADMIN_ROLE, deployer));
    console.log('Is MINTER_ROLE still the DEPLOYER?', await RandToken.hasRole(MINTER_ROLE, deployer));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandToken.hasRole(PAUSER_ROLE, deployer));
    console.log('Is DEFAULT_ADMIN transferred to the MS?', await RandToken.hasRole(DEFAULT_ADMIN_ROLE, multisig));
    console.log('Is MINTER_ROLE transferred to the MS?', await RandToken.hasRole(MINTER_ROLE, multisig));
    console.log('Is PAUSER_ROLE transferred to the MS?', await RandToken.hasRole(PAUSER_ROLE, multisig));

    console.log('\nRandVC');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandVC.hasRole(DEFAULT_ADMIN_ROLE, deployer));
    console.log('Is MINTER_ROLE still the DEPLOYER?', await RandVC.hasRole(MINTER_ROLE, deployer));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandVC.hasRole(PAUSER_ROLE, deployer));
    console.log('Is DEFAULT_ADMIN transferred to the MS?', await RandVC.hasRole(DEFAULT_ADMIN_ROLE, multisig));
    console.log('Is MINTER_ROLE transferred to the MS?', await RandVC.hasRole(MINTER_ROLE, multisig));
    console.log('Is PAUSER_ROLE transferred to the MS?', await RandVC.hasRole(PAUSER_ROLE, multisig));

    console.log('\nRandNFT');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandNFT.hasRole(DEFAULT_ADMIN_ROLE, deployer));
    console.log('Is MINTER_ROLE still the DEPLOYER?', await RandNFT.hasRole(MINTER_ROLE, deployer));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandNFT.hasRole(PAUSER_ROLE, deployer));
    console.log('Is DEFAULT_ADMIN transferred to the MS?', await RandNFT.hasRole(DEFAULT_ADMIN_ROLE, multisig));
    console.log('Is MINTER_ROLE transferred to the MS?', await RandNFT.hasRole(MINTER_ROLE, multisig));
    console.log('Is PAUSER_ROLE transferred to the MS?', await RandNFT.hasRole(PAUSER_ROLE, multisig));

    console.log('\nRandRegistry');
    console.log('Is DEFAULT_ADMIN still the DEPLOYER?', await RandRegistry.hasRole(DEFAULT_ADMIN_ROLE, deployer));
    console.log('Is PAUSER_ROLE still the DEPLOYER?', await RandRegistry.hasRole(PAUSER_ROLE, deployer));
    console.log('Is DEFAULT_ADMIN transferred to the MS?', await RandRegistry.hasRole(DEFAULT_ADMIN_ROLE, multisig));
    console.log('Is PAUSER_ROLE transferred to the MS?', await RandRegistry.hasRole(PAUSER_ROLE, multisig));

    console.log('Registry MS current address:', await RandRegistry.getAddressOf("MS"));
    console.log('Registry MS addresses:', await RandRegistry.getAllAddress("MS"));
    console.log('Registry RND current address:', await RandRegistry.getAddressOf("RND"));
    console.log('Registry RND addresses:', await RandRegistry.getAllAddress("RND"));
    console.log('Registry VCS current address:', await RandRegistry.getAddressOf("VCS"));
    console.log('Registry VCS addresses:', await RandRegistry.getAllAddress("VCS"));
    console.log('Registry RES current address:', await RandRegistry.getAddressOf("RES"));
    console.log('Registry RES addresses:', await RandRegistry.getAllAddress("RES"));
    console.log('Registry NFT current address:', await RandRegistry.getAddressOf("NFT"));
    console.log('Registry NFT addresses:', await RandRegistry.getAllAddress("NFT"));
    console.log('Registry GOV current address:', await RandRegistry.getAddressOf("GOV"));
    console.log('Registry GOV addresses:', await RandRegistry.getAllAddress("GOV"));
    console.log('Registry SM current address:', await RandRegistry.getAddressOf("SM"));
    console.log('Registry SM addresses:', await RandRegistry.getAllAddress("SM"));

};

module.exports.tags = ["MigrateRoles"];
module.exports.dependencies = ["AddressRegistry", "RandToken", "VestingControllerERC721", "InvestorsNFT"];