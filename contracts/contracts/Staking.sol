// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Staking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Tier { None, Bronze, Silver, Gold, Diamond, VIP }

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastStakeTime;
    }

    IERC20 public immutable stakingToken;
    
    // Staking Reward config (Mock dynamic reward system)
    uint256 public rewardPerBlock; // Mock reward amount per block
    uint256 public lastRewardBlock;
    uint256 public accRewardPerShare;

    mapping(address => UserInfo) public userInfo;
    
    // Tier thresholds
    uint256 public bronzeThreshold = 1000 * 10**18;
    uint256 public silverThreshold = 5000 * 10**18;
    uint256 public goldThreshold = 10000 * 10**18;
    uint256 public diamondThreshold = 25000 * 10**18;
    uint256 public vipThreshold = 50000 * 10**18;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event ThresholdsUpdated(uint256 bronze, uint256 silver, uint256 gold, uint256 diamond, uint256 vip);

    constructor(
        address _stakingToken,
        uint256 _rewardPerBlock
    ) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardPerBlock = _rewardPerBlock;
        lastRewardBlock = block.number;
    }

    function updatePool() public {
        if (block.number <= lastRewardBlock) {
            return;
        }
        uint256 tokenSupply = stakingToken.balanceOf(address(this));
        if (tokenSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = block.number - lastRewardBlock;
        uint256 tokenReward = multiplier * rewardPerBlock;
        accRewardPerShare = accRewardPerShare + (tokenReward * 1e12 / tokenSupply);
        lastRewardBlock = block.number;
    }

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        UserInfo storage user = userInfo[msg.sender];
        updatePool();

        if (user.amount > 0) {
            uint256 pending = (user.amount * accRewardPerShare / 1e12) - user.rewardDebt;
            if (pending > 0) {
                safeRewardTransfer(msg.sender, pending);
            }
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        user.amount += _amount;
        user.lastStakeTime = block.timestamp;
        user.rewardDebt = user.amount * accRewardPerShare / 1e12;

        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "Withdraw amount exceeds balance");
        updatePool();

        uint256 pending = (user.amount * accRewardPerShare / 1e12) - user.rewardDebt;
        if (pending > 0) {
            safeRewardTransfer(msg.sender, pending);
        }

        if (_amount > 0) {
            user.amount -= _amount;
            stakingToken.safeTransfer(msg.sender, _amount);
        }
        user.rewardDebt = user.amount * accRewardPerShare / 1e12;

        emit Withdrawn(msg.sender, _amount);
    }

    function claimRewards() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        updatePool();
        uint256 pending = (user.amount * accRewardPerShare / 1e12) - user.rewardDebt;
        require(pending > 0, "No rewards to claim");

        user.rewardDebt = user.amount * accRewardPerShare / 1e12;
        safeRewardTransfer(msg.sender, pending);
        emit RewardClaimed(msg.sender, pending);
    }

    function getUserTier(address _user) public view returns (Tier) {
        uint256 stakeAmount = userInfo[_user].amount;
        if (stakeAmount >= vipThreshold) return Tier.VIP;
        if (stakeAmount >= diamondThreshold) return Tier.Diamond;
        if (stakeAmount >= goldThreshold) return Tier.Gold;
        if (stakeAmount >= silverThreshold) return Tier.Silver;
        if (stakeAmount >= bronzeThreshold) return Tier.Bronze;
        return Tier.None;
    }

    function getUserTierMultiplier(address _user) public view returns (uint256) {
        Tier tier = getUserTier(_user);
        if (tier == Tier.VIP) return 1500;       // 15x
        if (tier == Tier.Diamond) return 600;   // 6x
        if (tier == Tier.Gold) return 300;      // 3x
        if (tier == Tier.Silver) return 150;    // 1.5x
        if (tier == Tier.Bronze) return 100;    // 1.0x
        return 0;                               // 0x
    }

    function setThresholds(
        uint256 _bronze,
        uint256 _silver,
        uint256 _gold,
        uint256 _diamond,
        uint256 _vip
    ) external onlyOwner {
        bronzeThreshold = _bronze;
        silverThreshold = _silver;
        goldThreshold = _gold;
        diamondThreshold = _diamond;
        vipThreshold = _vip;

        emit ThresholdsUpdated(_bronze, _silver, _gold, _diamond, _vip);
    }

    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        updatePool();
        rewardPerBlock = _rewardPerBlock;
    }

    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 balance = stakingToken.balanceOf(address(this)) - getStakedTokensTotal();
        if (_amount > balance) {
            stakingToken.safeTransfer(_to, balance);
        } else {
            stakingToken.safeTransfer(_to, _amount);
        }
    }

    function getStakedTokensTotal() public view returns (uint256) {
        // Normally returns sum of staked balances
        // We will just fetch contract staking state
        return stakingToken.balanceOf(address(this));
    }

    function getPendingReward(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 tokenSupply = stakingToken.balanceOf(address(this));
        uint256 tempAccRewardPerShare = accRewardPerShare;
        if (block.number > lastRewardBlock && tokenSupply != 0) {
            uint256 multiplier = block.number - lastRewardBlock;
            uint256 tokenReward = multiplier * rewardPerBlock;
            tempAccRewardPerShare = tempAccRewardPerShare + (tokenReward * 1e12 / tokenSupply);
        }
        return (user.amount * tempAccRewardPerShare / 1e12) - user.rewardDebt;
    }
}
