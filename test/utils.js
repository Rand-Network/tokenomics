const { ethers, getNamedAccounts, deployments } = require('hardhat');

async function getUUPSImplementationAddress(proxyContract) {
    // If your UUPS proxy has an 'implementation()' function
    try {
        const implementationAddress = await proxyContract.implementation();
        return implementationAddress;
    } catch (error) {
        console.error("Could not retrieve implementation address via function call. Fallback to storage slot.");
    }

    // If you need to query storage directly (example for ERC1967)
    // This slot is specified in EIP-1967 for UUPS proxies
    const slot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implementationAddress = await ethers.provider.getStorage(proxyContract.address, slot);
    return ethers.getAddress(ethers.toQuantity(implementationAddress));
}

function bigIntToHex(bigIntValue) {
    return '0x' + bigIntValue.toString(16);
}

async function getBlockTimestamp() {
    bts = (await ethers.provider.getBlock()).timestamp;
    ts = Math.ceil(Date.now() / 1000);
    return Math.max(bts, ts) + 1800;
}

async function createSignature_v1(signer_wallet, sender_addr, recipient_addr, amount, timestamp) {
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

async function mintInvestment_v1(
    VestingController,
    signer,
    sender,
    recipient,
    rndTokenAmount,
    vestingPeriod,
    vestingStartTime,
    cliffPeriod,
    nftLevel = 0,
) {

    // Wait 1000ms to avoid nonce issues
    await new Promise(r => setTimeout(r, 1000));

    // Get current timestamp
    timestamp = await getBlockTimestamp();

    // Create signature
    const signature = await createSignature_v1(signer, sender.address, recipient, rndTokenAmount, timestamp);


    // Calling the function using the specific method signature
    return await VestingController.connect(sender)['mintNewInvestment(bytes,uint256,(address,uint256,uint256,uint256,uint256),uint8)'](
        signature,
        timestamp,
        [recipient, rndTokenAmount, vestingPeriod, vestingStartTime, cliffPeriod],
        nftLevel
    );

}

async function mintInvestment_v2(
    VestingController,
    signer,
    sender,
    recipient,
    rndTokenAmount,
    vestingPeriod,
    vestingStartTime,
    cliffPeriod,
    nftLevel = 0,
) {

    // Wait 1000ms to avoid nonce issues
    await new Promise(r => setTimeout(r, 1000));

    // Get current timestamp
    timestamp = await getBlockTimestamp();

    // Create signature
    const signature = await createSignature_v2(signer, sender.address, recipient, rndTokenAmount, vestingStartTime, vestingPeriod, cliffPeriod, nftLevel, timestamp);

    // Calling the function using the specific method signature
    return await VestingController.connect(sender)['mintNewInvestment(bytes,uint256,(address,uint256,uint256,uint256,uint256),uint8)'](
        signature,
        timestamp,
        [recipient, rndTokenAmount, vestingPeriod, vestingStartTime, cliffPeriod],
        nftLevel
    );

}


async function distributeTokens_v1(
    VestingController,
    signer,
    sender,
    recipient,
    rndTokenAmount
) {
    // Wait 500ms to avoid nonce issues
    await new Promise(r => setTimeout(r, 1000));

    // Get current timestamp
    timestamp = await getBlockTimestamp();

    // Create signature
    const signature = await createSignature_v1(signer, sender.address, recipient, rndTokenAmount, timestamp);

    // Calling the function using the specific method signature
    return await VestingController.connect(sender)['distributeTokens(bytes,uint256,address,uint256)'](
        signature,
        timestamp,
        recipient,
        rndTokenAmount)

}

async function distributeTokens_v2(
    VestingController,
    signer,
    sender,
    recipient,
    rndTokenAmount
) {
    // Wait 500ms to avoid nonce issues
    await new Promise(r => setTimeout(r, 1000));

    // Get current timestamp
    timestamp = await getBlockTimestamp();

    // Create signature
    const signature = await createSignature_v2(signer, sender.address, recipient, rndTokenAmount, 0, 0, 0, 0, timestamp);

    // Calling the function using the specific method signature
    return await VestingController.connect(sender)['distributeTokens(bytes,uint256,address,uint256)'](
        signature,
        timestamp,
        recipient,
        rndTokenAmount)

}

module.exports = {
    getUUPSImplementationAddress,
    bigIntToHex,
    getBlockTimestamp,
    createSignature_v1,
    createSignature_v2,
    mintInvestment_v1,
    mintInvestment_v2,
    distributeTokens_v1,
    distributeTokens_v2
}
