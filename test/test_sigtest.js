const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

async function getBlockTimestamp() {
    bts = (await ethers.provider.getBlock()).timestamp;
    ts = Math.ceil(Date.now() / 1000);
    return Math.max(bts, ts) + 1800;
}

async function createSignature_v1(signer_wallet, sender_addr, recipient_addr, amount, timestamp) {
    // Wait 100ms to make sure the timestamp is different
    await new Promise(r => setTimeout(r, 1000));
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

async function createSignature_v2(signer_wallet, sender_addr, recipient_addr, rndAmount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp) {
    // Wait 100ms to make sure the timestamp is different
    await new Promise(r => setTimeout(r, 1000));
    // Get the chainId
    chainId = (await ethers.provider.getNetwork()).chainId;

    // STEP 1:
    // building hash has to come from system address
    // 32 bytes of data
    let messageHash = ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256", "uint256", "uint256", "uint8", "uint256", "uint256"],
        [sender_addr, recipient_addr, rndAmount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, chainId]
    );

    // STEP 2: 32 bytes of data in Uint8Array
    let messageHashBinary = ethers.getBytes(messageHash);

    // STEP 3: To sign the 32 bytes of data, make sure you pass in the data
    return await signer_wallet.signMessage(messageHashBinary);
}

describe("SigTest", function () {

    before(async function () {
        // Fetching named accounts
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;

        // Reset hardhat network
        await hre.network.provider.send("hardhat_reset", []);

        // Deploying contracts
        await deployments.fixture(["SigTest"]);

        const SigTestDeployment = await deployments.get("SigTest");
        const SigTestContract = await ethers.getContractFactory("SigTest");
        sigTest = SigTestContract.attach(SigTestDeployment.address);
    });

    it("Verify", async function () {

        [adminWallet, userWallet] = await ethers.getSigners();
        // Create solidity block.timestamp compatible timestamp
        timestamp = await getBlockTimestamp();
        amount = 100;
        recipient = userWallet.address;
        sender = userWallet;

        signature = createSignature_v1(adminWallet, userWallet.address, recipient, amount, timestamp);

        // STEP 4: Fire off the transaction with the adminWallet signed data
        tx = await sigTest.connect(userWallet).redeemSignatureTest(recipient, amount, timestamp, signature)
        // Expect the transaction to succeed and return true
        expect(await tx.wait()).to.emit(sigTest, "SignatureUsed").withArgs(userWallet.address, recipient, amount, timestamp, signature);
    });

    it("Try to verify same signature", async function () {
        await expect(sigTest.connect(userWallet).redeemSignatureTest(recipient, amount, timestamp, signature)).to.be.revertedWith("VC: Signature already used");
    });

    it("Try to verify with wrong amount", async function () {
        timestamp = await getBlockTimestamp();
        fail_amount = 300;
        signature = createSignature_v1(adminWallet, userWallet.address, recipient, amount, timestamp);
        await expect(sigTest.connect(userWallet).redeemSignatureTest(recipient, fail_amount, timestamp, signature)).to.be.revertedWith("VC: Signature not valid");
    });

    it("Try to verify from wrong sender", async function () {
        timestamp = await getBlockTimestamp();
        signature = createSignature_v1(adminWallet, userWallet.address, recipient, amount, timestamp);
        await expect(sigTest.connect(adminWallet).redeemSignatureTest(recipient, amount, timestamp, signature)).to.be.revertedWith("VC: Signature not valid");
    });

    it("Try to verify from wrong recipient", async function () {
        timestamp = await getBlockTimestamp();
        signature = createSignature_v1(adminWallet, userWallet.address, recipient, amount, timestamp);
        await expect(sigTest.connect(userWallet).redeemSignatureTest(adminWallet.address, amount, timestamp, signature)).to.be.revertedWith("VC: Signature not valid");
    });

    it("Try to verify old timestamp", async function () {
        timestamp = await getBlockTimestamp() - 3600;
        signature = createSignature_v1(adminWallet, userWallet.address, recipient, amount, timestamp);
        await expect(sigTest.connect(userWallet).redeemSignatureTest(recipient, amount, timestamp, signature)).to.be.revertedWith("VC: Signature has expired");
    });

});



describe("SigTestV2", function () {

    before(async function () {
        // Fetching named accounts
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;

        // Reset hardhat network
        await hre.network.provider.send("hardhat_reset", []);

        // Deploying contracts
        await deployments.fixture(["SigTest_V2"]);

        const SigTestDeployment = await deployments.get("SigTest_V2");
        const SigTestContract = await ethers.getContractFactory("SigTest_V2");
        sigTest = SigTestContract.attach(SigTestDeployment.address);
    });

    it("Verify", async function () {

        [adminWallet, userWallet] = await ethers.getSigners();
        // Create solidity block.timestamp compatible timestamp
        timestamp = await getBlockTimestamp();
        amount = 100;
        vestingStartTime = timestamp;
        vestingPeriod = 100;
        cliffPeriod = 0;
        nftLevel = 0;
        recipient = userWallet.address;
        sender = userWallet;

        signature = createSignature_v2(adminWallet, userWallet.address, recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp);
        // STEP 4: Fire off the transaction with the adminWallet signed data
        tx = await sigTest.connect(userWallet).redeemSignatureTest(recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, signature)
        // Expect the transaction to succeed and return true
        expect(await tx.wait()).to.emit(sigTest, "SignatureUsed").withArgs(userWallet.address, recipient, amount, timestamp, signature);
    });

    it("Try to verify same signature", async function () {
        await expect(sigTest.connect(userWallet).redeemSignatureTest(recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, signature)).to.be.revertedWith("VC: Signature already used");
    });

    it("Try to verify with wrong amount", async function () {
        timestamp = await getBlockTimestamp();
        fail_amount = 300;
        signature = createSignature_v2(adminWallet, userWallet.address, recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp);
        await expect(sigTest.connect(userWallet).redeemSignatureTest(recipient, fail_amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, signature)).to.be.revertedWith("VC: Signature not valid");
    });

    it("Try to verify from wrong sender", async function () {
        timestamp = await getBlockTimestamp();
        signature = createSignature_v2(adminWallet, userWallet.address, recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp);
        await expect(sigTest.connect(adminWallet).redeemSignatureTest(recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, signature)).to.be.revertedWith("VC: Signature not valid");
    });

    it("Try to verify from wrong recipient", async function () {
        timestamp = await getBlockTimestamp();
        signature = createSignature_v2(adminWallet, userWallet.address, recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp);
        await expect(sigTest.connect(userWallet).redeemSignatureTest(adminWallet.address, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, signature)).to.be.revertedWith("VC: Signature not valid");
    });

    it("Try to verify old timestamp", async function () {
        timestamp = await getBlockTimestamp() - 3600;
        signature = createSignature_v2(adminWallet, userWallet.address, recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp);
        await expect(sigTest.connect(userWallet).redeemSignatureTest(recipient, amount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp, signature)).to.be.revertedWith("VC: Signature has expired");
    });

});