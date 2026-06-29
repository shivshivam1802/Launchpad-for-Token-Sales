// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        address token;
        address beneficiary;
        uint256 start;
        uint256 cliff;
        uint256 duration;
        uint256 interval; // 0 for continuous/linear, or seconds (e.g. 86400 for daily, 604800 for weekly, 2592000 for monthly)
        uint256 tgeUnlockPct; // in bps (e.g. 1000 = 10%)
        uint256 totalAmount;
        uint256 releasedAmount;
        bool revoked;
    }

    VestingSchedule[] public schedules;
    mapping(address => uint256[]) public beneficiaryScheduleIds;

    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed token,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 start,
        uint256 duration
    );
    event TokensClaimed(uint256 indexed scheduleId, address indexed beneficiary, uint256 amountClaimed);
    event VestingRevoked(uint256 indexed scheduleId);

    constructor() Ownable(msg.sender) {}

    function createVestingSchedule(
        address _token,
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        uint256 _interval,
        uint256 _tgeUnlockPct,
        uint256 _totalAmount
    ) external nonReentrant returns (uint256 scheduleId) {
        require(_beneficiary != address(0), "Beneficiary is zero address");
        require(_totalAmount > 0, "Total amount must be greater than 0");
        require(_tgeUnlockPct <= 10000, "TGE unlock percent cannot exceed 100%");

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _totalAmount);

        scheduleId = schedules.length;
        schedules.push(VestingSchedule({
            token: _token,
            beneficiary: _beneficiary,
            start: _start,
            cliff: _start + _cliff,
            duration: _duration,
            interval: _interval,
            tgeUnlockPct: _tgeUnlockPct,
            totalAmount: _totalAmount,
            releasedAmount: 0,
            revoked: false
        }));

        beneficiaryScheduleIds[_beneficiary].push(scheduleId);

        emit VestingScheduleCreated(scheduleId, _token, _beneficiary, _totalAmount, _start, _duration);
    }

    function claim(uint256 _scheduleId) external nonReentrant {
        require(_scheduleId < schedules.length, "Invalid schedule ID");
        VestingSchedule storage schedule = schedules[_scheduleId];
        require(msg.sender == schedule.beneficiary, "Not beneficial owner");
        require(!schedule.revoked, "Vesting schedule was revoked");

        uint256 claimable = calculateClaimableAmount(_scheduleId);
        require(claimable > 0, "No tokens claimable at this moment");

        schedule.releasedAmount += claimable;
        IERC20(schedule.token).safeTransfer(schedule.beneficiary, claimable);

        emit TokensClaimed(_scheduleId, schedule.beneficiary, claimable);
    }

    function calculateClaimableAmount(uint256 _scheduleId) public view returns (uint256) {
        VestingSchedule storage schedule = schedules[_scheduleId];
        if (schedule.releasedAmount >= schedule.totalAmount || schedule.revoked) {
            return 0;
        }

        if (block.timestamp < schedule.start) {
            return 0;
        }

        uint256 totalVested = 0;
        uint256 tgeAmount = (schedule.totalAmount * schedule.tgeUnlockPct) / 10000;
        uint256 remainingVestingAmount = schedule.totalAmount - tgeAmount;

        if (block.timestamp >= schedule.start) {
            totalVested += tgeAmount;
        }

        if (block.timestamp >= schedule.cliff) {
            uint256 vestingTimeElapsed = block.timestamp - schedule.cliff;

            if (vestingTimeElapsed >= schedule.duration) {
                totalVested = schedule.totalAmount;
            } else {
                if (schedule.interval == 0) {
                    // Continuous linear vesting
                    totalVested += (remainingVestingAmount * vestingTimeElapsed) / schedule.duration;
                } else {
                    // Interval-based vesting (daily/weekly/monthly)
                    uint256 intervalsElapsed = vestingTimeElapsed / schedule.interval;
                    uint256 totalIntervals = schedule.duration / schedule.interval;
                    if (totalIntervals == 0) {
                        totalIntervals = 1;
                    }
                    if (intervalsElapsed > totalIntervals) {
                        intervalsElapsed = totalIntervals;
                    }
                    totalVested += (remainingVestingAmount * intervalsElapsed) / totalIntervals;
                }
            }
        }

        if (totalVested > schedule.totalAmount) {
            totalVested = schedule.totalAmount;
        }

        return totalVested - schedule.releasedAmount;
    }

    // Allows the platform administrator to revoke vesting (for compliance/security purposes if blacklisted)
    function revoke(uint256 _scheduleId) external onlyOwner {
        VestingSchedule storage schedule = schedules[_scheduleId];
        require(!schedule.revoked, "Already revoked");

        uint256 unreleased = schedule.totalAmount - schedule.releasedAmount;
        schedule.revoked = true;

        if (unreleased > 0) {
            IERC20(schedule.token).safeTransfer(owner(), unreleased);
        }

        emit VestingRevoked(_scheduleId);
    }

    function getSchedulesByBeneficiary(address _beneficiary) external view returns (uint256[] memory) {
        return beneficiaryScheduleIds[_beneficiary];
    }
}
