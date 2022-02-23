require("@nomiclabs/hardhat-etherscan");
const { expect } = require("chai");
const { BigNumber } = require("ethers")
const { ethers, upgrades, network } = require("hardhat");
const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");

describe("Contract registry", function () {

    let owner, alice, backend, Registry;

    before(async function () {

        let gotNetwork, chainId, localNode
        gotNetwork = await ethers.provider.getNetwork();
        chainId = gotNetwork.chainId;
        localNode = 31337; // local default chainId from hardhat.config.js
        console.log('Network: ', gotNetwork.name, chainId);
        numConfirmation = chainId !== localNode ? 1 : 0
        console.log('Number of confirmations to wait:', numConfirmation);

        [owner, alice, backend] = await ethers.getSigners();

        AddressRegistryFactory = await ethers.getContractFactory("AddressRegistry");

        Registry = await upgrades.deployProxy(
            AddressRegistryFactory,
            [owner.address],
            { kind: "uups" });

        Registry.deployed();
        await Registry.deployTransaction.wait(1);
        RegistryImpl = await upgrades.erc1967.getImplementationAddress(Registry.address);

        console.log('Deployed Token proxy at:', Registry.address);
        console.log('Deployed Token implementation at:', RegistryImpl);

    });

    describe("Registry functions", function () {
        it("Setting new address entry", async function () {
            const newName = "Owner"
            tx = await Registry.setNewAddress(newName, owner.address);
            tx2 = await Registry.getRegistryList();
            expect(tx2.toString()).to.equal([newName].toString());
        });
        it("Getting address", async function () {
            const newName = "Owner"
            expect(await Registry.getAddress(newName)).to.equal(owner.address);
        });
        it("Updating address", async function () {
            const name = "Owner"
            tx = await Registry.updateAddress(name, alice.address);
            expect(await Registry.getAddress(name)).to.equal(alice.address);
        });
        it("Getting all addresses", async function () {
            const name = "Owner"
            tx = await Registry.getAllAddress(name);
            expect(tx.toString()).to.equal([owner.address, alice.address].toString());
        });
        it("Setting another new address entry", async function () {
            const oldName = "Owner"
            const newName = "OwnerV2"
            tx = await Registry.setNewAddress(newName, owner.address);
            tx2 = await Registry.getRegistryList();
            expect(tx2.toString()).to.equal([oldName, newName].toString());
        });
    });

});