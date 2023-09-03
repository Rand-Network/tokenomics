const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');
const { getParams } = require("../deploy/00_deploy_params.js");
const { extendConfig } = require("hardhat/config.js");

function bigIntToHex(bigIntValue) {
    return '0x' + bigIntValue.toString(16);
}

async function getBlockTimestamp() {
    bts = (await ethers.provider.getBlock()).timestamp;
    ts = Math.ceil(Date.now() / 1000);
    return Math.max(bts, ts) + 1800;
}

async function createSignature(signer_wallet, sender_addr, recipient_addr, amount, timestamp) {

    // Get the chainId
    chainId = (await ethers.provider.getNetwork()).chainId;

    // STEP 1:
    // building hash has to come from system address
    // 32 bytes of data
    let messageHash = ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256", "uint256"],
        [sender_addr, recipient_addr, amount, timestamp, chainId]
    );

    // STEP 2: 32 bytes of data in Uint8Array
    let messageHashBinary = ethers.getBytes(messageHash);

    // STEP 3: To sign the 32 bytes of data, make sure you pass in the data
    return await signer_wallet.signMessage(messageHashBinary);
}

async function mintInvestment(
    VestingController,
    signer,
    sender,
    recipient,
    rndTokenAmount,
    vestingPeriod,
    vestingStartTime,
    cliffPeriod,
    nftTokenId = null
) {

    // Get current timestamp
    timestamp = await getBlockTimestamp();

    // Create signature
    const signature = await createSignature(signer, sender.address, recipient, rndTokenAmount, timestamp);


    // Calling the function using the specific method signature
    if (nftTokenId !== null) {
        return await VestingController.connect(sender)['mintNewInvestment(bytes,uint256,(address,uint256,uint256,uint256,uint256),uint256)'](
            signature,
            timestamp,
            [recipient, rndTokenAmount, vestingPeriod, vestingStartTime, cliffPeriod],
            nftTokenId
        );
    } else {
        return await VestingController.connect(sender)['mintNewInvestment(bytes,uint256,(address,uint256,uint256,uint256,uint256))'](
            signature,
            timestamp,
            [recipient, rndTokenAmount, vestingPeriod, vestingStartTime, cliffPeriod]
        );
    }
}


async function distributeTokens(
    VestingController,
    signer,
    sender,
    recipient,
    rndTokenAmount
) {
    // Get current timestamp
    timestamp = await getBlockTimestamp();

    // Create signature
    const signature = await createSignature(signer, sender.address, recipient, rndTokenAmount, timestamp);

    // Calling the function using the specific method signature
    return await VestingController.connect(sender)['distributeTokens(bytes,uint256,address,uint256)'](
        signature,
        timestamp,
        recipient,
        rndTokenAmount)

}


describe("VC ERC721 functions", function () {
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

        // Investment parameters
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = ethers.parseEther("100");
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(1) //BigInt(created_ts);
        cliffPeriod = BigInt("1");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);

        // Add allowance for VC to fetch tokens in claim
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);

        // Minting a sample investment token
        mint_tx_1 = await mintInvestment(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );

        mint_tx_2 = await mintInvestment(
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
        rndTokenAmount = ethers.parseEther("100");
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);

        console.log()

        mint_tx_3 = await mintInvestment(
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
        rndTokenAmount = ethers.parseEther("100");
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        mint_tx_4 = await mintInvestment(
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
    it("Claiming vested tokens by user and backend", async function () {
        // Mint a new investment token
        // solidity timestamp
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = ethers.parseEther("100");
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        mint_tx_5 = await mintInvestment(
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
        rndTokenAmount = ethers.parseEther("100");
        vestingPeriod = BigInt("10");
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("3");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);
        nftTokenId = BigInt(0);

        // Mint investment token with NFT
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        mint_tx_5 = await mintInvestment(
            VestingController,
            deployer_signer,
            alice_signer,
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
            nftTokenId
        );

        // Parse logs
        var rc = await mint_tx_5.wait(1);
        var logs = await VestingController.queryFilter(VestingController.filters.NewInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        var logsNFT = await VestingController.queryFilter(VestingController.filters.NFTInvestmentTokenMinted(), rc.blockNumber, rc.blockNumber);
        e_tokenId_5 = logs[0].args.tokenId;
        expect(logsNFT[0].args.nftTokenId).to.equal(nftTokenId);
        expect(logsNFT[0].args.tokenId).to.equal(BigInt(5));
    });
    it("Distribute tokens to investors", async function () {
        // Mint new non-vested investment token
        last_block = await ethers.provider.getBlock();
        created_ts = last_block.timestamp;
        recipient = alice;
        rndTokenAmount = ethers.parseEther("100");

        // Store balance of alice before distribution
        alice_before = await RandToken.balanceOf(alice);

        // Distribute tokens
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        mint_tx_6 = await distributeTokens(
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
});

