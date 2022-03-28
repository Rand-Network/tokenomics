const { ethers, upgrades, network } = require("hardhat");
const axios = require('axios');


async function main() {
    Registry = await ethers.getContractFactory("AddressRegistry");
    Token = await ethers.getContractFactory("RandToken");
    VestingController = await ethers.getContractFactory("VestingControllerERC721");
    SafetyModule = await ethers.getContractFactory("SafetyModuleERC20");
    InvestorsNFT = await ethers.getContractFactory("InvestorsNFT");
    Governance = await ethers.getContractFactory("Governance");

    RandNFT = InvestorsNFT.attach('0x6a823B4C93E6aa5598611E104ea8eadA07B078Fd');

    [owner, alice, backend] = await ethers.getSigners();
    console.log(owner.address);


    // Try finding a free nftTokenId
    let nftTokenId = 1;
    let JSON_URI;
    const baseURI = await RandNFT.baseURI();
    const ipfsPrefix = "https://ipfs.io/ipfs/";
    const urlPrefix = ipfsPrefix + baseURI.split("ipfs://")[1];
    const nftLevel = "Gold";

    while (true) {
        // Fetch tokenURI and check for passed nftLevel
        console.log("nftTokenId:", nftTokenId);
        tokenURI_url = urlPrefix + nftTokenId;
        await axios.get(tokenURI_url)
            .then(function (response) {
                JSON_URI = response.data;
                console.log(JSON_URI);
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
            } catch { break; }
        }
        // Increase counter
        nftTokenId += 1;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
