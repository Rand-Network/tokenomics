const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

async function createSignature(signer_wallet, sender_addr, recipient_addr, amount, timestamp, chainId) {
    // Sleep for 1 second to make sure the timestamp is different
    await new Promise(r => setTimeout(r, 1000));

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

describe("SigTest", function () {

    before(async function () {
        // Fetching named accounts
        const namedAccounts = await getNamedAccounts();
        deployer = namedAccounts.deployer;
        alice = namedAccounts.alice;

        // Deploying contracts
        await deployments.fixture(["SigTest"]);

        const SigTestDeployment = await deployments.get("SigTest");
        const SigTestContract = await ethers.getContractFactory("SigTest");
        sigTest = SigTestContract.attach(SigTestDeployment.address);
    });

    it("Verify", async function () {

        [adminWallet, userWallet] = await ethers.getSigners();
        // Create solidity block.timestamp compatible timestamp
        timestamp = Math.ceil(Date.now() / 1000);
        amount = 100;
        recipient = userWallet.address;
        sender = userWallet;
        chainId = (await ethers.provider.getNetwork()).chainId;

        signature = createSignature(adminWallet, userWallet.address, recipient, amount, timestamp, chainId);

        // STEP 4: Fire off the transaction with the adminWallet signed data
        tx = await sigTest.connect(userWallet).redeemSignature(recipient, amount, timestamp, signature)
        // Expect the transaction to succeed and return true
        expect(await tx.wait()).to.emit(sigTest, "SignatureUsed").withArgs(userWallet.address, recipient, amount, timestamp, signature);
    });

    it("Try to verify same signature", async function () {
        // Try again with same signature, should revert
        let errorOccurred = false;
        let errorMessage = '';
        try {
            await sigTest.connect(userWallet).redeemSignature(recipient, amount, timestamp, signature);
        } catch (error) {
            errorOccurred = true;
            errorMessage = error.message;
        }
        expect(errorOccurred).to.be.true;
        expect(errorMessage).to.include("VC: Signature already used");
    });

    it("Try to verify with wrong amount", async function () {
        // Try again with same signature, should return false
        timestamp = Math.ceil(Date.now() / 1000);
        fail_amount = 300;
        signature = createSignature(adminWallet, userWallet.address, recipient, amount, timestamp, chainId);

        // Try again with same signature, should revert
        let errorOccurred = false;
        let errorMessage = '';
        try {
            await sigTest.connect(userWallet).redeemSignature(recipient, fail_amount, timestamp, signature)
        } catch (error) {
            errorOccurred = true;
            errorMessage = error.message;
        }
        expect(errorOccurred).to.be.true;
        expect(errorMessage).to.include("VC: Signature not valid");
    });
    it("Try to verify from wrong sender", async function () {
        // Try again with same signature, should return false
        timestamp = Math.ceil(Date.now() / 1000);
        signature = createSignature(adminWallet, userWallet.address, recipient, amount, timestamp, chainId);

        // Try again with same signature, should revert
        let errorOccurred = false;
        let errorMessage = '';
        try {
            await sigTest.connect(adminWallet).redeemSignature(recipient, amount, timestamp, signature)
        } catch (error) {
            errorOccurred = true;
            errorMessage = error.message;
        }
        expect(errorOccurred).to.be.true;
        expect(errorMessage).to.include("VC: Signature not valid");
    });
    it("Try to verify from wrong recipient", async function () {
        // Try again with same signature, should return false
        timestamp = Math.ceil(Date.now() / 1000);
        signature = createSignature(adminWallet, userWallet.address, recipient, amount, timestamp, chainId);

        // Try again with same signature, should revert
        let errorOccurred = false;
        let errorMessage = '';
        try {
            await sigTest.connect(userWallet).redeemSignature(adminWallet.address, amount, timestamp, signature)
        } catch (error) {
            errorOccurred = true;
            errorMessage = error.message;
        }
        expect(errorOccurred).to.be.true;
        expect(errorMessage).to.include("VC: Signature not valid");
    });
    it("Try to verify old timestamp", async function () {
        // Try again with same signature, but an 1hr old timestamp, should return false
        timestamp = Math.ceil(Date.now() / 1000) - 3600;
        signature = createSignature(adminWallet, userWallet.address, recipient, amount, timestamp, chainId);

        // Try again with same signature, should revert
        let errorOccurred = false;
        let errorMessage = '';
        try {
            await sigTest.connect(userWallet).redeemSignature(recipient, amount, timestamp, signature)
        } catch (error) {
            errorOccurred = true;
            errorMessage = error.message;
        }
        expect(errorOccurred).to.be.true;
        expect(errorMessage).to.include("VC: Signature has expired");
    });

});