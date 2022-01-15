const { expect } = require("chai");

describe("Rand Token with Vesting Controller", function () {

  let Token;
  let VestingController;
  let RandToken;
  let RandVC;
  let owner;
  let alice;
  let bob;
  let charlie;

  beforeEach(async function () {
    Token = await ethers.getContractFactory("RandToken");
    VestingController = await ethers.getContractFactory("VestingControllerERC721");
    [owner, alice, bob, charlie] = await ethers.getSigners();

    RandToken = await Token.deploy();
    RandVC = await VestingController.deploy();
  });

  // You can nest describe calls to create subsections.
  describe("Deployment of RND-ERC20 and VC-ERC721", function () {
    it("Setting and checking owners of RND & VC", async function () { });
    it("Upgrading VC", async function () { });
  });

  describe("RND ERC20 functions", function () {
    it("Checking name, symbol and supply", async function () { });
    it("Minting tokens", async function () { });
    it("Burning tokens", async function () { });
    it("Transferring tokens", async function () { });
    it("Pausing contract", async function () { });
  });

  describe("VC ERC721 functions", function () {
    it("Checking name, symbol and supply", async function () { });
    it("Setting and checking tokenURI", async function () { });
    it("Should not be able to burn tokens", async function () { });
  });

  describe("Registering vesting investment on VC", function () {
    it("Minting new investment token", async function () { });
    it("Checking claimable tokens", async function () { });
    it("Claiming vested tokens by user", async function () { });
    it("Claiming vested tokens by backend", async function () { });
  });

  describe("VC interaction with SM", function () {
    it("Checking token balance before staking", async function () { });
    it("Setting allowance for SM in amount of stake", async function () { });
    it("Registering staked amount for investment", async function () { });
  });

});