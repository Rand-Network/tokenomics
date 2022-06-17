const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { ethers } = require("ethers");
const axios = require('axios');

exports.handler = async function (data) {
    // Compare it with a local secret
    const { mintSecret } = data.secrets;
    console.log("data.request.body:", data.request.body);
    if (data.request.body.mintSecret !== mintSecret) return "ERROR: WRONG SECRET";

    const VC_IPFS_ABI_HASH = 'Qmew5Lv9JcsbdDCnkfWe8K7dstsVAkntGTSR3phHuJ3fqi';
    const NFT_IPFS_ABI_HASH = 'QmTkJAdd7VS1Qbw9VH1Duq6zNhzQZgt4H6i5YKJCp6mPZL';
    const VC_ADDRESS = '0x40D733E520aBD8762b066aB27BbfDFf45bedF6e5';
    const NFT_ADDRESS = '0x6a823B4C93E6aa5598611E104ea8eadA07B078Fd';
    let VC_ABI;
    let NFT_ABI;

    // Get ABI from IPFS
    await axios.get(`https://gateway.pinata.cloud/ipfs/${VC_IPFS_ABI_HASH}`)
        .then(function (response) {
            VC_ABI = response.data;
        })
        .catch(function (error) {
            console.log(error);
        });
    await axios.get(`https://gateway.pinata.cloud/ipfs/${NFT_IPFS_ABI_HASH}`)
        .then(function (response) {
            NFT_ABI = response.data;
        })
        .catch(function (error) {
            console.log(error);
        });

    // Initialize defender relayer provider and signer
    const provider = new DefenderRelayProvider(data);
    const signer = new DefenderRelaySigner(data, provider, { speed: 'fast' });

    // Create Contract instances
    const RandVC = new ethers.Contract(VC_ADDRESS, VC_ABI, signer);
    const RandNFT = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);

    // Parse payload
    const recipient = data.request.body.recipient;
    const rndTokenAmount = ethers.utils.parseEther(data.request.body.rndTokenAmount.toString());
    const vestingPeriod = ethers.BigNumber.from(data.request.body.vestingPeriod);
    const vestingStartTime = ethers.BigNumber.from(data.request.body.vestingStartTime);
    const cliffPeriod = ethers.BigNumber.from(data.request.body.cliffPeriod);
    // Blue, Black, Red, Gold
    const nftLevel = data.request.body.nftLevel;

    // Try finding a free nftTokenId
    let nftTokenId = 1;
    let JSON_URI;
    const baseURI = await RandNFT.baseURI();
    const ipfsPrefix = "https://ipfs.io/ipfs/";
    const urlPrefix = ipfsPrefix + baseURI.split("ipfs://")[1];

    while (true) {
        // Fetch tokenURI and check for passed nftLevel
        console.log("nftTokenId:", nftTokenId);
        tokenURI_url = urlPrefix + nftTokenId;
        await axios.get(tokenURI_url)
            .then(function (response) {
                JSON_URI = response.data;
                console.log(JSON_URI.name);
            })
            .catch(function (error) {
                console.log(error);
            });
        // Check if its owned by anyone
        // Exit if found free tokenId
        if (JSON_URI.name.includes(nftLevel)) {
            try {
                tx = await RandNFT.ownerOf(nftTokenId);
                nftTokenId += 1;
                continue;
            } catch {
                console.log("Found unMinted nftTokenId:", nftTokenId);
                // Mint investment with NFT
                const tx = await RandVC['mintNewInvestment(address,uint256,uint256,uint256,uint256,uint256)'](
                    recipient,
                    rndTokenAmount,
                    vestingPeriod,
                    vestingStartTime,
                    cliffPeriod,
                    nftTokenId
                );
                // Wait for confirmation and return value and parse events
                const rc = await tx.wait(1);
                const event = rc.events.find(event => event.event === 'NewInvestmentTokenMinted');
                console.log(`Call executed in ${tx.hash}`);
                return { tx: tx.hash, tokenId: event.args.tokenId, nftTokenId: nftTokenId };
            }
        }
        // Increase counter
        nftTokenId += 1;
    }
};