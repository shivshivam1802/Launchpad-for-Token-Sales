import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Web3 Token Launchpad Suite", function () {
  let owner: any;
  let admin: any;
  let projectOwner: any;
  let buyer1: any;
  let buyer2: any;
  let referrerL1: any;
  let referrerL2: any;

  let launchToken: any;
  let projectToken: any;
  let paymentToken: any; // Mock USDT

  let staking: any;
  let referral: any;
  let vesting: any;
  let locker: any;
  let treasury: any;
  let multisig: any;
  let factory: any;
  let governance: any;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    admin = signers[1];
    projectOwner = signers[2];
    buyer1 = signers[3];
    buyer2 = signers[4];
    referrerL1 = signers[5];
    referrerL2 = signers[6];

    // Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    launchToken = await MockERC20.deploy("Launchpad Utility Token", "LAUNCH", 18, ethers.parseEther("10000000"));
    projectToken = await MockERC20.deploy("Super App Token", "SUPER", 18, ethers.parseEther("10000000"));
    paymentToken = await MockERC20.deploy("Tether USD Mock", "USDT", 6, ethers.parseEther("10000000"));

    // Deploy core services
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(owner.address);

    const Referral = await ethers.getContractFactory("Referral");
    referral = await Referral.deploy();

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy();

    const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
    locker = await LiquidityLocker.deploy();

    const Staking = await ethers.getContractFactory("Staking");
    // Reward per block = 1 LAUNCH
    staking = await Staking.deploy(await launchToken.getAddress(), ethers.parseEther("1"));

    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(await staking.getAddress());

    const MultiSig = await ethers.getContractFactory("MultiSigWallet");
    multisig = await MultiSig.deploy([owner.address, admin.address], 2);

    const Factory = await ethers.getContractFactory("LaunchpadFactory");
    factory = await Factory.deploy(
      await staking.getAddress(),
      await referral.getAddress(),
      await vesting.getAddress(),
      await locker.getAddress(),
      await treasury.getAddress()
    );

    // Provide initial staking balances to buyers to check tiers
    await launchToken.transfer(buyer1.address, ethers.parseEther("20000")); // Silver Tier
    await launchToken.transfer(buyer2.address, ethers.parseEther("60000")); // VIP Tier
  });

  describe("Staking & Tiers", function () {
    it("should calculate user tiers based on staked LAUNCH balance", async function () {
      const buyer1Token = launchToken.connect(buyer1);
      const buyer1Staking = staking.connect(buyer1);

      await buyer1Token.approve(await staking.getAddress(), ethers.parseEther("20000"));
      
      // Initially None
      expect(await staking.getUserTier(buyer1.address)).to.equal(0); // None
      
      // Stake 4000 LAUNCH (Bronze is 1000, Silver is 5000, Gold is 10000, VIP is 50000)
      await buyer1Staking.stake(ethers.parseEther("4000"));
      expect(await staking.getUserTier(buyer1.address)).to.equal(1); // Bronze

      // Stake 8000 more (12000 total -> Gold)
      await buyer1Staking.stake(ethers.parseEther("8000"));
      expect(await staking.getUserTier(buyer1.address)).to.equal(3); // Gold
    });
  });

  describe("Referral System", function () {
    it("should compute commissions based on multi-level relationships", async function () {
      // Setup referrers: buyer1 referred by referrerL1, referrerL1 referred by referrerL2
      await referral.connect(buyer1).recordReferral(buyer1.address, referrerL1.address);
      await referral.connect(referrerL1).recordReferral(referrerL1.address, referrerL2.address);

      // Verify referrer association
      const buyerInfo = await referral.getReferralInfo(buyer1.address);
      expect(buyerInfo.referrer).to.equal(referrerL1.address);

      const l1Info = await referral.getReferralInfo(referrerL1.address);
      expect(l1Info.referrer).to.equal(referrerL2.address);
    });
  });

  describe("Token Sale IDO Lifecycle", function () {
    let saleContract: any;
    let saleAddress: string;

    beforeEach(async function () {
      // Approve factory to spend project owner's tokens for sale setup
      await projectToken.transfer(projectOwner.address, ethers.parseEther("1000000"));
      
      // Deploy Token Sale contract via factory
      const config = {
        saleToken: await projectToken.getAddress(),
        acceptedToken: await paymentToken.getAddress(),
        rate: 100, // 100 project tokens per 1 USDT
        softCap: ethers.parseEther("1000"), // in USDT units (with decimals)
        hardCap: ethers.parseEther("5000"),
        minBuy: ethers.parseUnits("50", 6), // 50 USDT
        maxBuy: ethers.parseUnits("1000", 6), // 1000 USDT
        startTime: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
        endTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        useTiers: true
      };

      const vestingConfig = {
        start: Math.floor(Date.now() / 1000) + 4000,
        cliff: 0,
        duration: 3600, // 1 hour linear vesting
        interval: 0, // continuous
        tgeUnlockPct: 2000 // 20% instant release
      };

      // Project owner launches sale
      const tx = await factory.connect(projectOwner).createSale(config, vestingConfig);
      const receipt = await tx.wait();
      
      // Find event
      const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === "SaleCreated");
      saleAddress = event.args[0];
      
      saleContract = await ethers.getContractAt("TokenSale", saleAddress);

      // Deposit project tokens into TokenSale
      await projectToken.connect(projectOwner).transfer(saleAddress, ethers.parseEther("500000")); // 500k SUPER
      
      // Provide USDT to buyers
      await paymentToken.transfer(buyer1.address, ethers.parseUnits("5000", 6));
      await paymentToken.transfer(buyer2.address, ethers.parseUnits("5000", 6));
    });

    it("should allow buying and verify caps and tier multipliers", async function () {
      // Warp time to start of sale
      await ethers.provider.send("evm_increaseTime", [130]);
      await ethers.provider.send("evm_mine", []);

      // Stake tokens for buyer1 to enter Gold Tier (multiplier = 3x = maxBuy of 3000 USDT)
      const buyer1LaunchToken = launchToken.connect(buyer1);
      await buyer1LaunchToken.approve(await staking.getAddress(), ethers.parseEther("15000"));
      await staking.connect(buyer1).stake(ethers.parseEther("15000"));

      // Approve USDT payment
      await paymentToken.connect(buyer1).approve(saleAddress, ethers.parseUnits("2000", 6));

      // Purchase tokens (2000 USDT)
      await saleContract.connect(buyer1).purchase(ethers.parseUnits("2000", 6), ethers.ZeroAddress);
      
      expect(await saleContract.purchases(buyer1.address)).to.equal(ethers.parseUnits("2000", 6));
      expect(await saleContract.totalRaised()).to.equal(ethers.parseUnits("2000", 6));
    });
  });
});
