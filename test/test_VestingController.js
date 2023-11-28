const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');
const { getParams } = require("../deploy/00_deploy_params.js");
const { extendConfig } = require("hardhat/config.js");
const {
    getUUPSImplementationAddress,
    mintInvestment_v1,
    mintInvestment_v2,
    distributeTokens_v1,
    distributeTokens_v2,
    bigIntToHex
} = require("../test/utils");

describe("VC ERC721 functions", function () {
    let deployer;
    let alice;
    let backend;
    let RandToken;
    let VestingController;
    let VestingController_V1;
    let VestingController_V2;
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
        await deployments.fixture(["AddressRegistry", "RandToken", "VestingControllerERC721", "InvestorsNFT"]);

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

        // Making sure that the deployer is the RES in the AddressRegistry
        await AddressRegistry.updateAddress("RES", deployer_signer.address);

        // Investment parameters
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(1) //BigInt(created_ts);
        cliffPeriod = BigInt("1");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);

        // Add allowance for VC to fetch tokens in claim
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);

        // Minting a sample investment token
        mint_tx_1 = await mintInvestment_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );

        mint_tx_2 = await mintInvestment_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );


        var rc = await mint_tx_1.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        e_tokenId_0 = logs[0].args.tokenId;

        var rc = await mint_tx_2.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        e_tokenId_1 = logs[0].args.tokenId;

    });
    it("Checking name, symbol and supply", async function () {
        params = await getParams();
        expect(await VestingController.name()).to.equal(params._VCdeployParams._name);
        expect(await VestingController.symbol()).to.equal(params._VCdeployParams._symbol);
        expect(await VestingController.totalSupply()).to.equal(BigInt(2));
    });
    it("Should not be able to burn tokens", async function () {
        // Should be able to burn from default admin role
        alice_balance = await VestingController.balanceOf(alice);
        deployer_balance = await RandToken.balanceOf(deployer);
        vc_balance = await RandToken.balanceOf(await VestingController.getAddress());
        await VestingController.burn(e_tokenId_1);
        alice_balance_after = await VestingController.balanceOf(alice);
        deployer_balance_after = await RandToken.balanceOf(deployer);
        vc_balance_after = await RandToken.balanceOf(await VestingController.getAddress());
        expect(alice_balance - BigInt(1)).to.equal(alice_balance_after);
        expect(deployer_balance + BigInt(rndTokenAmount)).to.equal(deployer_balance_after);
        expect(vc_balance - BigInt(rndTokenAmount)).to.equal(vc_balance_after);

        // Should not burn with owner of the investment token
        const DEFAULT_ADMIN_ROLE = await RandToken.DEFAULT_ADMIN_ROLE();
        const alice_lower = ethers.getAddress(alice).toLowerCase();
        const expectedErrorMessage = `AccessControl: account ${alice_lower} is missing role ${DEFAULT_ADMIN_ROLE}`;
        await expect(VestingController.connect(alice_signer).burn(e_tokenId_0)).to.be.revertedWith(expectedErrorMessage);

        // Burn from deployer
        await VestingController.burn(e_tokenId_0);
    });
    it("Checking claimable tokens", async function () {
        // Mint a new investment token
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = deployer;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);

        mint_tx_3 = await mintInvestment_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );

        var rc = await mint_tx_3.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        e_tokenId_2 = logs[0].args.tokenId;

        // Loop through each block and check claimable tokens
        for (let i = 0; i < vestingPeriod + cliffPeriod - BigInt(1); i++) {
            // Mine ahead to increase block.timestamp
            await hre.network.provider.send("evm_mine");

            // Check claimable tokens
            const claimable_return = await VestingController.getClaimableTokens(e_tokenId_2);

            // Calculate expected claimable tokens
            if (i < cliffPeriod - BigInt(1)) {
                // No claimable tokens during cliff period
                claimable_estimate = BigInt(0);
            } else {
                // Claimable tokens after cliff period
                claimable_estimate = claimablePerPeriod * BigInt(i - 1);
            }
            expect(claimable_estimate).to.equal(claimable_return);
        }

        // Burn the investment token
        await VestingController.burn(e_tokenId_2);

    });
    it("Get full investment info", async function () {
        // Mint a new investment token
        // solidity timestamp
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = deployer;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        mint_tx_4 = await mintInvestment_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );
        var rc = await mint_tx_4.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        e_tokenId_3 = logs[0].args.tokenId;

        // Get full investment info and check
        await VestingController.getInvestmentInfo(e_tokenId_3).then(function (res) {
            var var1 = res[0];
            var var2 = res[1];
            var var3 = res[2];
            var var4 = res[3];
            expect(var1).to.be.equal(rndTokenAmount);
            expect(var2).to.be.equal(BigInt(0)); //rndClaimedAmount
            expect(var3).to.be.equal(vestingPeriod);
            expect(var4).to.be.equal(vestingStartTime + BigInt(cliffPeriod));
        });

        // Burn the investment token
        await VestingController.burn(e_tokenId_3);
    });
    it("Claiming vested tokens by investor", async function () {
        // Mint a new investment token
        // solidity timestamp
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        mint_tx_5 = await mintInvestment_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );
        var rc = await mint_tx_5.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        e_tokenId_4 = logs[0].args.tokenId;

        // Mine an amount of blocks to increase block.timestamp
        period = vestingPeriod / BigInt(2);
        periods = cliffPeriod + BigInt(period);

        periods_to_mine = bigIntToHex(periods);
        current_block_number = await ethers.provider.getBlockNumber();
        await hre.network.provider.send("hardhat_mine", [periods_to_mine]);

        // Check balances
        claimableAmount = await VestingController.connect(alice_signer).getClaimableTokens(e_tokenId_4);
        claimableAmountHalf = claimableAmount / BigInt(2);
        const aliceBalanceBefore = await RandToken.balanceOf(alice);
        expect(claimableAmount).to.be.equal(
            claimablePerPeriod * BigInt(periods_to_mine)
            - ((cliffPeriod - BigInt(1)) * claimablePerPeriod));

        // Claim half by alice
        tx = await VestingController.connect(alice_signer).claimTokens(e_tokenId_4, claimableAmountHalf);
        aliceBalanceAfter = await RandToken.balanceOf(alice);
        expect(aliceBalanceBefore + BigInt(claimableAmountHalf) == aliceBalanceAfter);

        // Claim other half by alice
        tx = await VestingController.connect(alice_signer).claimTokens(e_tokenId_4, claimableAmountHalf);
        aliceBalanceAfter = await RandToken.balanceOf(alice);
        expect(aliceBalanceBefore + BigInt(claimableAmountHalf) == aliceBalanceAfter);
    });
    it("Claiming remaining vested tokens by alice", async function () {
        const aliceBalanceBefore = await RandToken.balanceOf(alice);
        claimableAmount = await VestingController.connect(alice_signer).getClaimableTokens(e_tokenId_4);
        tx = await VestingController.connect(alice_signer).claimTokens(e_tokenId_4, claimableAmount);
        aliceBalanceAfter = await RandToken.balanceOf(alice);
        expect(aliceBalanceBefore + BigInt(claimableAmount) == aliceBalanceAfter);

        // Mine remaining blocks and claim all tokens
        claimableAmount = await VestingController.connect(alice_signer).getClaimableTokens(e_tokenId_4);
        periods_to_mine = bigIntToHex((rndTokenAmount - claimableAmount) / claimablePerPeriod);
        await hre.network.provider.send("hardhat_mine", [periods_to_mine]);
        claimableAmount = await VestingController.connect(alice_signer).getClaimableTokens(e_tokenId_4);
        await VestingController.connect(alice_signer).claimTokens(e_tokenId_4, claimableAmount);
        aliceBalanceAfter = await RandToken.balanceOf(alice);
        expect(aliceBalanceBefore + rndTokenAmount == aliceBalanceAfter);
    });
    it("Mint investment with NFT", async function () {
        // Mint a new investment token with NFT
        // solidity timestamp
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        nftTokenId = BigInt(1);
        nftLevel = BigInt(1);

        // Mint investment token with NFT
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        mint_tx_5 = await mintInvestment_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
            nftLevel
        );

        // Parse logs
        var rc = await mint_tx_5.wait(1);
        var logsNFT = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMintedWithNFT(), rc.blockNumber, rc.blockNumber);
        e_tokenId_5 = logsNFT[0].args.tokenId;
        e_nftLevel_5 = logsNFT[0].args.nftLevel;
        e_nftTokenId_5 = logsNFT[0].args.nftTokenId;

        expect(e_tokenId_5).to.equal(BigInt(5));
        expect(e_nftLevel_5).to.equal(nftLevel - BigInt(1));
        expect(e_nftTokenId_5).to.equal(nftTokenId);

        // Call getTokenIdOfNFT to get VestingController tokenId based on NFT tokenId
        tokenId = await VestingController.getTokenIdOfNFT(e_nftTokenId_5);
        expect(tokenId).to.equal(e_tokenId_5);

    });
    it("Check tokenURI", async function () {
        // Set baseURI
        const baseURI = "https://example.com/";
        await InvestorsNFT.setBaseURI(baseURI);

        // Get tokenId
        NftTokenId = await VestingController.getTokenIdOfNFT(e_nftTokenId_5);

        // Check tokenURI
        expect(await InvestorsNFT.tokenURI(e_nftTokenId_5)).to.equal(baseURI + "BLACK");
    });
    it("Get investment info for NFT", async function () {
        // Get full investment info for NFT with getInvestmentInfoForNFT function
        await AddressRegistry.updateAddress("NFT", deployer_signer.address);
        await VestingController.getInvestmentInfoForNFT(nftTokenId).then(function (res) {
            var var1 = res[0];
            var var2 = res[1];
            expect(var1).to.be.equal(rndTokenAmount);
            expect(var2).to.be.equal(BigInt(0)); //rndClaimedAmount
        });
        // Set back NFT address in Registry
        await AddressRegistry.updateAddress("NFT", await InvestorsNFT.getAddress());
    });
    it("Distribute tokens to investors", async function () {
        // Mint new non-vested investment token
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();

        // Store balance of alice before distribution
        alice_before = await RandToken.balanceOf(alice);

        // Distribute tokens
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        mint_tx_6 = await distributeTokens_v1(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
        );

        // Parse logs
        var rc = await mint_tx_6.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.InvestmentTransferred(), rc.blockNumber, rc.blockNumber);
        expect(logs[0].args.recipient).to.equal(alice);
        expect(logs[0].args.amount).to.equal(rndTokenAmount);

        // Assert that the correct amount of tokens was distributed
        alice_after = await RandToken.balanceOf(alice);
        expect(alice_before + rndTokenAmount).to.equal(alice_after);

    });
    it("Upgrade VestingControllerERC721 to V2", async function () {
        // Deploying VestingController_V2 via Fixture
        await deployments.fixture(["VestingControllerERC721_V2"], { keepExistingDeployments: true });

        vc_v1 = await deployments.get("VestingControllerERC721");
        vc_v2 = await deployments.get("VestingControllerERC721_V2");

        const VestingControllerDeployment = await deployments.get("VestingControllerERC721");
        const VestingControllerContract = await ethers.getContractFactory("VestingControllerERC721");
        VestingController_V1 = VestingControllerContract.attach(VestingControllerDeployment.address);

        const VestingController_V2_Deployment = await deployments.get("VestingControllerERC721_V2");
        const VestingController_V2_Contract = await ethers.getContractFactory("VestingControllerERC721_V2");
        VestingController_V2 = VestingController_V2_Contract.attach(VestingController_V2_Deployment.address);

        // Check if the upgrade was successful
        expect(await VestingController.name()).to.equal(params._VCdeployParams._name);
        expect(await VestingController.symbol()).to.equal(params._VCdeployParams._symbol);
        expect(await VestingController.totalSupply()).to.equal(BigInt(2));

        // Should only have 2 investment tokens left after burning 3 of them
        expect(await VestingController.totalSupply()).to.equal(BigInt(2));

        // Console log tokenId 0 using getInvestmentInfo
        await VestingController.getInvestmentInfo(NftTokenId).then(function (res) {
            var var1 = res[0];
            var var2 = res[1];
            var var3 = res[2];
            var var4 = res[3];
            expect(var1).to.be.equal(rndTokenAmount);
            expect(var2).to.be.equal(BigInt(0)); //rndClaimedAmount
            expect(var3).to.be.equal(vestingPeriod);
            expect(var4).to.be.equal(vestingStartTime + BigInt(cliffPeriod));
        });

        // Check that implementation V1 is different from V2
        expect(VestingControllerDeployment.implementation).to.not.equal(VestingController_V2_Deployment.address);
    });

    it("Mint investment with V2", async function () {
        // Mint a new investment token with NFT
        // solidity timestamp
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        nftTokenId = BigInt(1);
        nftLevel = BigInt(1);

        // Mint investment token with NFT
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        mint_tx_7 = await mintInvestment_v2(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
            nftLevel
        );

        // Parse logs
        var rc = await mint_tx_7.wait(1);
        var logsNFT = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMintedWithNFT(), rc.blockNumber, rc.blockNumber);
        e_tokenId_6 = logsNFT[0].args.tokenId;
        e_nftLevel_6 = logsNFT[0].args.nftLevel;
        e_nftTokenId_6 = logsNFT[0].args.nftTokenId;

        expect(e_tokenId_6).to.equal(BigInt(6));
        expect(e_nftLevel_6).to.equal(nftLevel - BigInt(1));

    });
    it("Distribute tokens to investors with V2", async function () {
        // Mint new non-vested investment token
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = BigInt(100) * BigInt(10) ** await RandToken.decimals();

        // Store balance of alice before distribution
        alice_before = await RandToken.balanceOf(alice);

        // Distribute tokens
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        mint_tx_8 = await distributeTokens_v2(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
        );

        // Parse logs
        var rc = await mint_tx_8.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.InvestmentTransferred(), rc.blockNumber, rc.blockNumber);
        expect(logs[0].args.recipient).to.equal(alice);
        expect(logs[0].args.amount).to.equal(rndTokenAmount);

        // Assert that the correct amount of tokens was distributed
        alice_after = await RandToken.balanceOf(alice);
        expect(alice_before + rndTokenAmount).to.equal(alice_after);
    });
});
