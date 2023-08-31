const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

async function createSignature(signer, recipient, amount, timestamp) {

    // Create the message
    const message = ethers.solidityPacked(
        //["address", "uint256", "uint256"],
        //[recipient, amount, timestamp]
        ["address"], [signer.address]

    );

    // Hash the message
    const hash = ethers.solidityPackedKeccak256(["bytes"], [message])

    // Convert to Ethereum Signed Message Hash
    const signedMessage = ethers.hashMessage(ethers.getBytes(hash));

    // Sign the message hash
    const signature = await signer.signMessage(ethers.getBytes(signedMessage));
    const decoded = ethers.verifyMessage(ethers.getBytes(signedMessage), signature);

    console.log("signer:", signer.address);
    console.log("recipient:", recipient);
    console.log("amount:", amount);
    console.log("timestamp:", timestamp);

    console.log("message:", message);
    console.log("hash:", hash);
    console.log("signedMessage:", signedMessage);
    console.log("signature:", signature);
    console.log("decoded:", decoded);

    return signature;


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
        const timestamp = Date.now();
        const amount = 100;
        const recipient = userWallet.address;

        // STEP 1:
        // building hash has to come from system address
        // 32 bytes of data
        let messageHash = ethers.solidityPackedKeccak256(
            ["address", "address", "uint256", "uint256"],
            [userWallet.address, recipient, amount, timestamp]
        );

        // STEP 2: 32 bytes of data in Uint8Array
        let messageHashBinary = ethers.getBytes(messageHash);

        // STEP 3: To sign the 32 bytes of data, make sure you pass in the data
        let signature = await adminWallet.signMessage(messageHashBinary);

        // STEP 4: Fire off the transaction with the adminWallet signed data
        await sigTest.connect(userWallet).isDataValid(recipient, amount, timestamp, signature);
    });
});