const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

async function redeemSignature(signer_wallet, sender_addr, recipient_addr, amount, timestamp, chainId) {
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

        console.log("alice:", alice);
        console.log("deployer:", deployer);

        // Deploying contracts
        await deployments.fixture(["SigTest"]);

        const SigTestDeployment = await deployments.get("SigTest");
        const SigTestContract = await ethers.getContractFactory("SigTest");
        sigTest = SigTestContract.attach(SigTestDeployment.address);
    });

    it("Verify", async function () {

        const [adminWallet, userWallet] = await ethers.getSigners();
        // Create solidity block.timestamp compatible timestamp
        const timestamp = Math.ceil(Date.now() / 1000);
        const amount = 100;
        const recipient = userWallet.address;
        const sender = userWallet;
        const chainId = (await ethers.provider.getNetwork()).chainId;

        const signature = redeemSignature(adminWallet, sender.address, recipient, amount, timestamp, chainId);

        // STEP 4: Fire off the transaction with the adminWallet signed data
        tx = await sigTest.connect(sender).redeemSignature(recipient, amount, timestamp, signature)
        // Expect the transaction to succeed and return true
        expect(await tx.wait()).to.emit(sigTest, "SignatureUsed").withArgs(sender.address, recipient, amount, timestamp, signature);

        // Try again with same signature, should revert
        let errorOccurred = false;
        let errorMessage = '';
        try {
            await sigTest.connect(sender).redeemSignature(recipient, amount, timestamp, signature);
        } catch (error) {
            errorOccurred = true;
            errorMessage = error.message;
        }
        expect(errorOccurred).to.be.true;
        expect(errorMessage).to.include("VC: Signature already used");


    });
});