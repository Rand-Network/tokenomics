const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');
const { getParams } = require("../deploy/00_deploy_params.js");

function bigIntToHex(bigIntValue) {
    return '0x' + bigIntValue.toString(16);
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

        // Deploying contracts
        await deployments.fixture(["AddressRegistry", "RandToken", "VestingControllerERC721"]);

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
        vestingStartTime = BigInt(created_ts);
        cliffPeriod = BigInt("1");
        claimablePerPeriod = rndTokenAmount / BigInt(vestingPeriod);

        // Add allowance for VC to fetch tokens in claim
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);
        tx = await RandToken.increaseAllowance(await VestingController.getAddress(), rndTokenAmount);

        // Minting a sample investment token
        mint_tx_1 = await VestingController['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
            recipient,
            rndTokenAmount,
            vestingPeriod,
            vestingStartTime,
            cliffPeriod,
        );
        mint_tx_2 = await VestingController['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
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
        mint_tx_3 = await VestingController['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
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
        mint_tx_4 = await VestingController['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
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
        mint_tx_5 = await VestingController['mintNewInvestment(address,uint256,uint256,uint256,uint256)'](
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
});

