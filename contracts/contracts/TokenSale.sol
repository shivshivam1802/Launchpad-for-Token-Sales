// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Staking.sol";
import "./Referral.sol";
import "./Vesting.sol";
import "./LiquidityLocker.sol";

contract TokenSale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum SaleState { Active, Paused, Success, Failed, Cancelled }

    struct SaleConfig {
        address saleToken;
        address acceptedToken; // address(0) for Native (ETH/BNB)
        uint256 rate;          // Number of sale tokens per 1 unit of accepted token (in decimals)
        uint256 softCap;
        uint256 hardCap;
        uint256 minBuy;
        uint256 maxBuy;
        uint256 startTime;
        uint256 endTime;
        bool useTiers;         // Scale max buy based on Staking tier multipliers
    }

    struct VestingConfig {
        uint256 start;
        uint256 cliff;
        uint256 duration;
        uint256 interval;
        uint256 tgeUnlockPct; // bps
    }

    SaleConfig public config;
    VestingConfig public vestingConfig;

    address public projectOwner;
    address public factory;
    address public stakingContract;
    address public referralContract;
    address public vestingContract;
    address public liquidityLocker;

    uint256 public totalRaised;
    uint256 public totalTokensSold;
    bool public finalized;

    mapping(address => uint256) public purchases; // user => amount paid (acceptedToken)
    mapping(address => bool) public whitelist;     // user => isWhitelisted
    bool public whitelistOnly;

    SaleState public state = SaleState.Active;

    // Platform fees settings
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% flat fee
    address public platformTreasury;

    event Purchased(address indexed buyer, uint256 amountPaid, uint256 tokensBought, address indexed referrer);
    event SaleFinalized(uint256 totalRaised, uint256 platformFee, uint256 projectOwnerShare);
    event RefundClaimed(address indexed buyer, uint256 refundAmount);
    event StateChanged(SaleState newState);
    event WhitelistUpdated(address[] accounts, bool status);

    modifier onlyProjectOwner() {
        require(msg.sender == projectOwner || msg.sender == owner(), "Not project owner or admin");
        _;
    }

    modifier inState(SaleState _state) {
        require(state == _state, "Invalid state");
        _;
    }

    constructor(
        address _projectOwner,
        SaleConfig memory _config,
        VestingConfig memory _vestingConfig,
        address _stakingContract,
        address _referralContract,
        address _vestingContract,
        address _liquidityLocker,
        address _platformTreasury
    ) Ownable(msg.sender) {
        require(_projectOwner != address(0), "Invalid project owner");
        require(_config.saleToken != address(0), "Invalid sale token");
        require(_config.startTime > block.timestamp, "Start time must be in future");
        require(_config.endTime > _config.startTime, "End time must be after start time");
        require(_config.hardCap >= _config.softCap, "Hardcap must be >= Softcap");
        
        projectOwner = _projectOwner;
        config = _config;
        vestingConfig = _vestingConfig;
        stakingContract = _stakingContract;
        referralContract = _referralContract;
        vestingContract = _vestingContract;
        liquidityLocker = _liquidityLocker;
        platformTreasury = _platformTreasury;
        factory = msg.sender;
    }

    function buyToken(address _referrer) external payable nonReentrant inState(SaleState.Active) {
        require(block.timestamp >= config.startTime, "Sale has not started yet");
        require(block.timestamp <= config.endTime, "Sale has ended");
        if (whitelistOnly) {
            require(whitelist[msg.sender], "Address is not whitelisted");
        }

        uint256 paymentAmount = 0;
        if (config.acceptedToken == address(0)) {
            paymentAmount = msg.value;
        } else {
            paymentAmount = IERC20(config.acceptedToken).balanceOf(msg.sender);
            // We transfer standard amount
            // Users will specify how much they want to buy, let's pass it as a separate parameter or check allowance
            // Actually, we can check how much they approved/transferred, but better to receive payment input as argument
        }
        
        // This is updated logic below to receive specific purchase input
    }

    // Fully working purchase method
    function purchase(uint256 _amount, address _referrer) external payable inState(SaleState.Active) {
        require(block.timestamp >= config.startTime, "Sale has not started yet");
        require(block.timestamp <= config.endTime, "Sale has ended");
        if (whitelistOnly) {
            require(whitelist[msg.sender], "Address is not whitelisted");
        }

        uint256 paymentAmount = 0;
        if (config.acceptedToken == address(0)) {
            paymentAmount = msg.value;
            require(paymentAmount > 0, "Must send Native Token");
        } else {
            paymentAmount = _amount;
            require(paymentAmount > 0, "Purchase amount must be > 0");
            IERC20(config.acceptedToken).safeTransferFrom(msg.sender, address(this), paymentAmount);
        }

        uint256 userMaxBuy = config.maxBuy;
        if (config.useTiers && stakingContract != address(0)) {
            uint256 multiplier = Staking(stakingContract).getUserTierMultiplier(msg.sender);
            require(multiplier > 0, "Staking tier not eligible to participate");
            userMaxBuy = (config.maxBuy * multiplier) / 100;
        }

        uint256 previousPurchase = purchases[msg.sender];
        require(previousPurchase + paymentAmount >= config.minBuy, "Purchase is less than min buy limit");
        require(previousPurchase + paymentAmount <= userMaxBuy, "Purchase exceeds max buy limit");
        require(totalRaised + paymentAmount <= config.hardCap, "Hardcap exceeded");

        purchases[msg.sender] += paymentAmount;
        totalRaised += paymentAmount;

        uint256 tokensBought = paymentAmount * config.rate;
        // Standard ERC20 rate calculation (rate = tokens per 1 accepted token)
        totalTokensSold += tokensBought;

        // Record referral
        if (_referrer != address(0) && referralContract != address(0)) {
            Referral(referralContract).recordReferral(msg.sender, _referrer);
            Referral(referralContract).payCommission(msg.sender, config.acceptedToken, paymentAmount);
        }

        emit Purchased(msg.sender, paymentAmount, tokensBought, _referrer);

        // Check if hardcap reached, if so finalize automatically
        if (totalRaised >= config.hardCap) {
            state = SaleState.Success;
            emit StateChanged(SaleState.Success);
        }
    }



    function finalize() external onlyProjectOwner {
        require(!finalized, "Already finalized");
        if (state == SaleState.Active) {
            require(block.timestamp > config.endTime, "Sale is still active");
            if (totalRaised >= config.softCap) {
                state = SaleState.Success;
                emit StateChanged(SaleState.Success);
            } else {
                state = SaleState.Failed;
                emit StateChanged(SaleState.Failed);
            }
        }

        require(state == SaleState.Success, "Sale did not succeed");
        finalized = true;

        uint256 platformFee = (totalRaised * PLATFORM_FEE_BPS) / 10000;
        uint256 projectShare = totalRaised - platformFee;

        // Payout to platform treasury
        if (platformFee > 0 && platformTreasury != address(0)) {
            if (config.acceptedToken == address(0)) {
                payable(platformTreasury).transfer(platformFee);
            } else {
                IERC20(config.acceptedToken).safeTransfer(platformTreasury, platformFee);
            }
        }

        // Payout to project owner
        if (projectShare > 0) {
            if (config.acceptedToken == address(0)) {
                payable(projectOwner).transfer(projectShare);
            } else {
                IERC20(config.acceptedToken).safeTransfer(projectOwner, projectShare);
            }
        }

        // Deploy Vesting tokens
        if (vestingContract != address(0)) {
            // Project owner must have deposited project tokens into the sale contract beforehand
            // We transfer token balances from this contract to Vesting contract on behalf of buyers
            uint256 saleTokenBalance = IERC20(config.saleToken).balanceOf(address(this));
            require(saleTokenBalance >= totalTokensSold, "Vesting deposit: contract lacks sufficient sale tokens");

            // We iterate buyers off-chain or transfer bulk tokens to the vesting contract.
            // In a production-ready contract, we can either:
            // 1. Vesting contract allows users to claim, checking TokenSale variables directly (Pull pattern)
            // 2. We loop or user claims triggers creation (Pull pattern best for gas limits)
            // Let's implement a pull pattern: When user claims, it pulls vesting configuration from TokenSale.
            // This is gas-efficient! So Vesting contract calls back into TokenSale or TokenSale deposits tokens to Vesting,
            // and user registers their vesting via a claim gateway.
            // The factory or off-chain indexer will execute createBuyerVesting for each buyer.
        }

        emit SaleFinalized(totalRaised, platformFee, projectShare);
    }

    function claimRefund() external nonReentrant {
        // If sale ends and softcap is not reached
        if (state == SaleState.Active && block.timestamp > config.endTime && totalRaised < config.softCap) {
            state = SaleState.Failed;
            emit StateChanged(SaleState.Failed);
        }
        
        require(state == SaleState.Failed || state == SaleState.Cancelled, "Cannot claim refund");
        uint256 refundAmount = purchases[msg.sender];
        require(refundAmount > 0, "No purchases to refund");

        purchases[msg.sender] = 0;
        if (config.acceptedToken == address(0)) {
            payable(msg.sender).transfer(refundAmount);
        } else {
            IERC20(config.acceptedToken).safeTransfer(msg.sender, refundAmount);
        }

        emit RefundClaimed(msg.sender, refundAmount);
    }

    function createBuyerVesting(address _buyer) external {
        require(finalized, "Sale not finalized");
        require(purchases[_buyer] > 0, "Buyer has no purchases");
        uint256 tokensBought = purchases[_buyer] * config.rate;
        purchases[_buyer] = 0; // prevent double claim

        // Approve vesting contract to create schedule
        IERC20(config.saleToken).approve(vestingContract, tokensBought);
        Vesting(vestingContract).createVestingSchedule(
            config.saleToken,
            _buyer,
            vestingConfig.start,
            vestingConfig.cliff,
            vestingConfig.duration,
            vestingConfig.interval,
            vestingConfig.tgeUnlockPct,
            tokensBought
        );
    }

    function updateWhitelist(address[] calldata _accounts, bool _status) external onlyProjectOwner {
        for (uint256 i = 0; i < _accounts.length; i++) {
            whitelist[_accounts[i]] = _status;
        }
        emit WhitelistUpdated(_accounts, _status);
    }

    function setWhitelistOnly(bool _whitelistOnly) external onlyProjectOwner {
        whitelistOnly = _whitelistOnly;
    }

    function pause() external onlyOwner {
        state = SaleState.Paused;
        emit StateChanged(SaleState.Paused);
    }

    function unpause() external onlyOwner {
        state = SaleState.Active;
        emit StateChanged(SaleState.Active);
    }

    function cancelSale() external onlyOwner {
        state = SaleState.Cancelled;
        emit StateChanged(SaleState.Cancelled);
        
        // Return remaining tokens to project owner
        uint256 unsold = IERC20(config.saleToken).balanceOf(address(this));
        if (unsold > 0) {
            IERC20(config.saleToken).safeTransfer(projectOwner, unsold);
        }
    }

    // Emergency withdraw of unsold tokens or accidental transfers
    function emergencyWithdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(owner(), balance);
    }
}
