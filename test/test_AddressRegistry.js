const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

describe("AddressRegistry functions", function () {
    let AddressRegistry;
    let deployer;
    let alice;

    before(async function () {
        // Fetching named accounts
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;

        // Deploying contracts
        await deployments.fixture(["AddressRegistry"]);

        const AddressRegistryDeployment = await deployments.get("AddressRegistry");
        const AddressRegistryContract = await ethers.getContractFactory("AddressRegistry");
        AddressRegistry = AddressRegistryContract.attach(AddressRegistryDeployment.address);
    });

    it("Setting new address entry", async function () {
        const name = "Test";
        const full_list = "MS,VCS,SM,GOV,Test";
        const tx = await AddressRegistry.setNewAddress(name, deployer);
        const tx2 = await AddressRegistry.getRegistryList();
        expect(tx2.toString()).to.equal([full_list].toString());
    });

    it("Getting address", async function () {
        const name = "Test";
        expect(await AddressRegistry.getAddressOf(name)).to.equal(deployer);
    });
    it("Updating address", async function () {
        const name = "Test";
        tx = await AddressRegistry.updateAddress(name, alice);
        expect(await AddressRegistry.getAddressOf(name)).to.equal(alice);
    });
    it("Getting all addresses", async function () {
        const name = "Test";
        tx = await AddressRegistry.getAllAddress(name);
        expect(tx.toString()).to.equal([deployer, alice].toString());
    });
    it("Setting another new address entry", async function () {
        const newName = "TestV2";
        const full_list = "MS,VCS,SM,GOV,Test";
        tx = await AddressRegistry.setNewAddress(newName, deployer);
        tx2 = await AddressRegistry.getRegistryList();
        expect(tx2.toString()).to.equal([full_list, newName].toString());
    });
});

