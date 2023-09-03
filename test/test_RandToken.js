const { ethers, getNamedAccounts, deployments } = require('hardhat');
const { getParams } = require("../deploy/00_deploy_params.js");
const { expect } = require("chai");

describe("RandToken ERC20 functions", function () {
    let deployer;
    let alice;
    let RandToken;

    before(async function () {
        // Fetching named accounts
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;

        // Get signers
        const signers = await ethers.getSigners();
        deployer_signer = signers[0];
        alice_signer = signers[1];

        // Deploying contracts
        await deployments.fixture(["AddressRegistry", "RandToken"]);

        const AddressRegistryDeployment = await deployments.get("AddressRegistry");
        const AddressRegistryContract = await ethers.getContractFactory("AddressRegistry");
        AddressRegistry = AddressRegistryContract.attach(AddressRegistryDeployment.address);

        const RandTokenDeployment = await deployments.get("RandToken");
        const RandTokenContract = await ethers.getContractFactory("RandToken");
        RandToken = RandTokenContract.attach(RandTokenDeployment.address);
    });

    it("Checking name, symbol and supply", async function () {
        // Should have correct name and symbol
        params = await getParams();
        expect(await RandToken.name()).to.equal(params._RNDdeployParams._name);
        expect(await RandToken.symbol()).to.equal(params._RNDdeployParams._symbol);

        // Deployer should have all tokens
        const ownerBalance = await RandToken.balanceOf(deployer);
        expect(await RandToken.totalSupply()).to.equal(ownerBalance);
    });
    it("Minting tokens", async function () {
        // Should mint with owner
        const amount = BigInt("1") ** BigInt("18");
        const ownerBalanceBefore = await RandToken.balanceOf(deployer);
        tx = await RandToken.mint(deployer, amount);
        const ownerBalanceAfter = await RandToken.balanceOf(deployer);
        expect(ownerBalanceBefore + BigInt(amount)).to.equal(ownerBalanceAfter);

        // Should not mint from alice
        const MINTER_ROLE_HASH = await RandToken.MINTER_ROLE();
        const alice_lower = ethers.getAddress(alice).toLowerCase();
        const expectedErrorMessage = `AccessControl: account ${alice_lower} is missing role ${MINTER_ROLE_HASH}`;
        await expect(RandToken.connect(alice_signer).mint(alice, amount)).to.be.revertedWith(expectedErrorMessage);

    });
    it("Burning tokens", async function () {
        // Should burn with owner
        const amount = BigInt("1") ** BigInt("18");
        const ownerBalanceBefore = await RandToken.balanceOf(deployer);
        tx = await RandToken.increaseAllowance(deployer, amount);
        tx = await RandToken.burnFrom(deployer, amount);
        const ownerBalanceAfter = await RandToken.balanceOf(deployer);
        expect(ownerBalanceBefore - BigInt(amount)).to.equal(ownerBalanceAfter);

        // Should not burn from owner by alice
        const expectedErrorMessage = "ERC20: insufficient allowance";
        await expect(RandToken.connect(alice_signer).burnFrom(deployer, amount)).to.be.revertedWith(expectedErrorMessage);

    });
    it("Transferring tokens", async function () {
        // Should transfer with deployer, check balances
        const amount = BigInt("1") ** BigInt("18");
        const ownerBalanceBefore = await RandToken.balanceOf(deployer);
        const aliceBalanceBefore = await RandToken.balanceOf(alice);
        tx = await RandToken.transfer(alice, amount);
        const ownerBalanceAfter = await RandToken.balanceOf(deployer);
        expect(ownerBalanceBefore - BigInt(amount)).to.equal(ownerBalanceAfter);
        expect(aliceBalanceBefore + BigInt(amount)).to.equal(amount);

    });
    it("Pausing contract", async function () {
        // Should not transfer when paused
        tx = await RandToken.pause();
        const amount = BigInt("1") ** BigInt("18");
        await expect(RandToken.transfer(alice, amount)).to.be.revertedWith("Pausable: paused");

        // Should be able to transfer when unpaused
        tx = await RandToken.unpause();
        expect(await RandToken.transfer(alice, amount));
    });
    it("Checking ImportsManager's updateRegistryAddress", async function () {
        // Should revert as Pausable: not paused
        await expect(RandToken.updateRegistryAddress(await AddressRegistry.getAddress())).to.be.revertedWith("Pausable: not paused");

        // Need to pause contract to update registry address
        tx = await RandToken.pause();

        // Update registry address
        tx = await RandToken.updateRegistryAddress(await AddressRegistry.getAddress());
        var rc = await tx.wait(1);
        var logs = await RandToken.queryFilter(RandToken.filters.RegistryAddressUpdated(), rc.blockNumber, rc.blockNumber);
        new_address = logs[0].args.newAddress
        expect(new_address).to.equal(await AddressRegistry.getAddress());

        // Should not update registry address from alice
        const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
        const alice_lower = ethers.getAddress(alice).toLowerCase();
        const expectedErrorMessage = `AccessControl: account ${alice_lower} is missing role ${DEFAULT_ADMIN_ROLE}`;
        await expect(RandToken.connect(alice_signer).updateRegistryAddress(await AddressRegistry.getAddress())).to.be.revertedWith(expectedErrorMessage);

    });
});

