const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');
const { getParams } = require("../deploy/00_deploy_params.js");
const { extendConfig } = require("hardhat/config.js");


describe("NFT ERC721 functions", function () {
    let deployer;
    let alice;
    let backend;
    let RandToken;
    let VestingController;
    let rndTokenAmount;
    let e_tokenId_1;
    let e_tokenId_2;


    before(async function () {
        // Fetching named accounts
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;
        backend = namedAccounts.backend;

        // Get signers
        const signers = await ethers.getSigners();
        deployer_signer = signers[0];
        alice_signer = signers[1];
        backend_signer = signers[2];

        // Reset hardhat network
        await hre.network.provider.send("hardhat_reset", []);

        // Deploying contracts
        await deployments.fixture(["AddressRegistry", "VestingControllerERC721", "InvestorsNFT"]);

        const InvestorsNFTDeployment = await deployments.get("InvestorsNFT");
        const InvestorsNFTContract = await ethers.getContractFactory("InvestorsNFT");
        InvestorsNFT = InvestorsNFTContract.attach(InvestorsNFTDeployment.address);


    });
    it("Checking name, symbol and supply", async function () {
        params = await getParams();
        expect(await InvestorsNFT.name()).to.equal(params._NFTdeployParams._name);
        expect(await InvestorsNFT.symbol()).to.equal(params._NFTdeployParams._symbol);
        expect(await InvestorsNFT.totalSupply()).to.equal(BigInt(0));
    });
    it("Set and check baseURI, contractURI", async function () {
        // Set baseURI and contractURI
        const baseURI = "https://example.com/";
        await InvestorsNFT.setBaseURI(baseURI);

        // Assert
        expect(await InvestorsNFT.baseURI()).to.equal(baseURI);
        expect(await InvestorsNFT.contractURI()).to.equal(baseURI + "contract_uri");

    });

    it("Should not be able to burn tokens", async function () {
        // Mint sample NFT
        tx = await InvestorsNFT.mintInvestmentNFT(alice, BigInt(0));

        // Get tokenId
        var rc = await tx.wait(1);
        var logsNFT = await InvestorsNFT.queryFilter(InvestorsNFT.filters.Transfer(), rc.blockNumber, rc.blockNumber);
        sender = logsNFT[0].args.from;
        recipient = logsNFT[0].args.to;
        NfttokenId = logsNFT[0].args.tokenId;

        // Should not be able to burn from deployer
        await expect(InvestorsNFT.connect(deployer_signer).burn(NfttokenId)).to.be.revertedWith("ERC721Burnable: caller is not owner nor approved");

        // Should be able to burn from alice
        tx = await InvestorsNFT.connect(alice_signer).burn(NfttokenId);
    });
    it("Pause and unpause", async function () {
        // Pause
        tx = await InvestorsNFT.pause();
        expect(await InvestorsNFT.paused()).to.equal(true);

        // Should not be able to mint
        await expect(InvestorsNFT.mintInvestmentNFT(alice, BigInt(0))).to.be.revertedWith("Pausable: paused");

        // Should not be able to burn
        await expect(InvestorsNFT.connect(alice_signer).burn(BigInt(0))).to.be.revertedWith("Pausable: paused");

        // Should not be able to setBaseURI
        await expect(InvestorsNFT.setBaseURI("https://example.com/")).to.be.revertedWith("Pausable: paused");

        // Unpause
        tx = await InvestorsNFT.unpause();
        expect(await InvestorsNFT.paused()).to.equal(false);
    });
});

