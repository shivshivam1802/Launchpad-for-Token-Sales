import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of Launchpad Smart Contracts...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // 1. Deploy Mock Utility Token ($LAUNCH)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const launchToken = await MockERC20.deploy(
    "Launchpad Utility Token",
    "LAUNCH",
    18,
    ethers.parseEther("100000000") // 100M supply
  );
  await launchToken.waitForDeployment();
  const launchTokenAddress = await launchToken.getAddress();
  console.log(`LAUNCH Token deployed to: ${launchTokenAddress}`);

  // 2. Deploy Mock Payment Currencies (USDT, USDC, DAI)
  const usdtMock = await MockERC20.deploy("Tether USD Mock", "USDT", 6, ethers.parseEther("10000000"));
  await usdtMock.waitForDeployment();
  const usdtAddress = await usdtMock.getAddress();
  console.log(`USDT Token deployed to: ${usdtAddress}`);

  const usdcMock = await MockERC20.deploy("USD Coin Mock", "USDC", 6, ethers.parseEther("10000000"));
  await usdcMock.waitForDeployment();
  const usdcAddress = await usdcMock.getAddress();
  console.log(`USDC Token deployed to: ${usdcAddress}`);

  const daiMock = await MockERC20.deploy("Dai Stablecoin Mock", "DAI", 18, ethers.parseEther("10000000"));
  await daiMock.waitForDeployment();
  const daiAddress = await daiMock.getAddress();
  console.log(`DAI Token deployed to: ${daiAddress}`);

  // 3. Deploy Platform Treasury
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`Treasury deployed to: ${treasuryAddress}`);

  // 4. Deploy Referral Manager
  const Referral = await ethers.getContractFactory("Referral");
  const referral = await Referral.deploy();
  await referral.waitForDeployment();
  const referralAddress = await referral.getAddress();
  console.log(`Referral deployed to: ${referralAddress}`);

  // 5. Deploy Vesting Manager
  const Vesting = await ethers.getContractFactory("Vesting");
  const vesting = await Vesting.deploy();
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log(`Vesting deployed to: ${vestingAddress}`);

  // 6. Deploy Liquidity Locker
  const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
  const locker = await LiquidityLocker.deploy();
  await locker.waitForDeployment();
  const lockerAddress = await locker.getAddress();
  console.log(`LiquidityLocker deployed to: ${lockerAddress}`);

  // 7. Deploy Staking Contract
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(launchTokenAddress, ethers.parseEther("1")); // 1 LAUNCH block reward
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`Staking deployed to: ${stakingAddress}`);

  // 8. Deploy Governance DAO
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(stakingAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log(`Governance (DAO) deployed to: ${governanceAddress}`);

  // 9. Deploy Admin MultiSig
  const MultiSig = await ethers.getContractFactory("MultiSigWallet");
  const multisig = await MultiSig.deploy([deployer.address], 1); // 1-of-1 for development ease
  await multisig.waitForDeployment();
  const multisigAddress = await multisig.getAddress();
  console.log(`MultiSigWallet deployed to: ${multisigAddress}`);

  // 10. Deploy LaunchpadFactory
  const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
  const factory = await LaunchpadFactory.deploy(
    stakingAddress,
    referralAddress,
    vestingAddress,
    lockerAddress,
    treasuryAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`LaunchpadFactory deployed to: ${factoryAddress}`);

  console.log("All contracts successfully deployed!");
  console.log({
    launchToken: launchTokenAddress,
    usdt: usdtAddress,
    usdc: usdcAddress,
    dai: daiAddress,
    treasury: treasuryAddress,
    referral: referralAddress,
    vesting: vestingAddress,
    locker: lockerAddress,
    staking: stakingAddress,
    governance: governanceAddress,
    multisig: multisigAddress,
    factory: factoryAddress,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
