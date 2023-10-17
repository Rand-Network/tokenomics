const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

describe("Role migration in post-deployment", function () {
    let RandToken, VestingController, InvestorsNFT, RandRegistry;
    let namedAccounts, signers;
    let deployer, alice, backend;
    let deployer_signer, alice_signer, backend_signer;

    before(async function () {
        // Fetching named accounts
        namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;
        backend = namedAccounts.backend;

        // Get signers
        signers = await ethers.getSigners();
        deployer_signer = signers[0];
        alice_signer = signers[1];
        backend_signer = signers[2];

        // Deploying contracts
        await deployments.fixture(["AddressRegistry", "RandToken", "VestingControllerERC721", "InvestorsNFT", "MigrateRoles"]);

        // Fetch deployments
        const AddressRegistryDeployment = await deployments.get("AddressRegistry");
        const AddressRegistryContract = await ethers.getContractFactory("AddressRegistry");
        AddressRegistry = AddressRegistryContract.attach(AddressRegistryDeployment.address);

        const RandTokenDeployment = await deployments.get("RandToken");
        const RandTokenContract = await ethers.getContractFactory("RandToken");
        RandToken = RandTokenContract.attach(RandTokenDeployment.address);

        const VestingControllerDeployment = await deployments.get("VestingControllerERC721");
        const VestingControllerContract = await ethers.getContractFactory("VestingControllerERC721");
        VestingController = VestingControllerContract.attach(VestingControllerDeployment.address);

        const InvestorsNFTDeployment = await deployments.get("InvestorsNFT");
        const InvestorsNFTContract = await ethers.getContractFactory("InvestorsNFT");
        InvestorsNFT = InvestorsNFTContract.attach(InvestorsNFTDeployment.address);

    });

    it("Should have correctly migrated roles for RandToken", async function () {

        const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
        const MINTER_ROLE = await RandToken.MINTER_ROLE();
        const PAUSER_ROLE = await RandToken.PAUSER_ROLE();

        expect(await RandToken.hasRole(DEFAULT_ADMIN_ROLE, deployer)).to.equal(false);
        expect(await RandToken.hasRole(MINTER_ROLE, deployer)).to.equal(false);
        expect(await RandToken.hasRole(PAUSER_ROLE, deployer)).to.equal(false);

        expect(await RandToken.hasRole(DEFAULT_ADMIN_ROLE, multisig)).to.equal(true);
        expect(await RandToken.hasRole(MINTER_ROLE, multisig)).to.equal(true);
        expect(await RandToken.hasRole(PAUSER_ROLE, multisig)).to.equal(true);
    });

    it("Should have correctly migrated roles for VestingController", async function () {
        const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
        const MINTER_ROLE = await RandToken.MINTER_ROLE();
        const PAUSER_ROLE = await RandToken.PAUSER_ROLE();

        expect(await VestingController.hasRole(DEFAULT_ADMIN_ROLE, deployer)).to.equal(false);
        expect(await VestingController.hasRole(MINTER_ROLE, deployer)).to.equal(false);
        expect(await VestingController.hasRole(PAUSER_ROLE, deployer)).to.equal(false);

        expect(await VestingController.hasRole(DEFAULT_ADMIN_ROLE, multisig)).to.equal(true);
        expect(await VestingController.hasRole(MINTER_ROLE, multisig)).to.equal(true);
        expect(await VestingController.hasRole(PAUSER_ROLE, multisig)).to.equal(true);
    });

    it("Should have correctly migrated roles for InvestorsNFT", async function () {
        const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
        const MINTER_ROLE = await RandToken.MINTER_ROLE();
        const PAUSER_ROLE = await RandToken.PAUSER_ROLE();

        expect(await InvestorsNFT.hasRole(DEFAULT_ADMIN_ROLE, deployer)).to.equal(false);
        expect(await InvestorsNFT.hasRole(MINTER_ROLE, deployer)).to.equal(false);
        expect(await InvestorsNFT.hasRole(PAUSER_ROLE, deployer)).to.equal(false);

        expect(await InvestorsNFT.hasRole(DEFAULT_ADMIN_ROLE, multisig)).to.equal(true);
        expect(await InvestorsNFT.hasRole(MINTER_ROLE, multisig)).to.equal(true);
        expect(await InvestorsNFT.hasRole(PAUSER_ROLE, multisig)).to.equal(true);
    });

    it("Should have correctly updated registry addresses", async function () {
        expect(await AddressRegistry.getAddressOf("MS")).to.equal(multisig);
        expect(await AddressRegistry.getAddressOf("GOV")).to.equal(multisig);
    });

    it("Should have correctly migrated roles for AddressRegistry", async function () {
        const DEFAULT_ADMIN_ROLE = await AddressRegistry.DEFAULT_ADMIN_ROLE();
        const PAUSER_ROLE = await AddressRegistry.PAUSER_ROLE();

        expect(await AddressRegistry.hasRole(DEFAULT_ADMIN_ROLE, deployer)).to.equal(false);
        expect(await AddressRegistry.hasRole(PAUSER_ROLE, deployer)).to.equal(false);

        expect(await AddressRegistry.hasRole(DEFAULT_ADMIN_ROLE, multisig)).to.equal(true);
        expect(await AddressRegistry.hasRole(PAUSER_ROLE, multisig)).to.equal(true);
    });
});
