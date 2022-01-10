const { cons } = require("fp-ts/lib/NonEmptyArray2v");
const { ethers } = require("hardhat");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async function main() {

    const provider = ethers.provider
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const alice = accounts[1]
    const bob = accounts[2]

    for (const account in accounts) {
        console.log(accounts[account].address)
      }

    const _tokenAmount = ethers.utils.parseUnits("100", 0)
    const _vestingPeriod = 5
    const _cliffStartTime = 0

    console.log('Total investment amount: ', )

    // We get the contract to deploy
    const VestingController = await ethers.getContractFactory("VestingController")
    const vc = await VestingController.deploy()

    console.log("Contract deployed to:", vc.address, " at block:", await ethers.provider.getBlockNumber())
    console.log("Adding new investment to deployer");

    await vc.addInvestment(deployer.address,
                            _tokenAmount,
                            _vestingPeriod,
                            _cliffStartTime)

    for (i = 0; i < _vestingPeriod; i++) {

        await network.provider.send("evm_mine");
        lockedAmount = await vc.calculateLockedAmount(deployer.address);
        console.log("Locked amount:", lockedAmount, "at block:", await ethers.provider.getBlockNumber())
        //await sleep(1e3);
        
    }

    console.log("Adding new investment to alice");


    await vc.addInvestment(alice.address,
                            _tokenAmount,
                            _vestingPeriod,
                            _cliffStartTime)



  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });