// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquidityLocker is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        address token;
        address owner;
        uint256 amount;
        uint256 lockTime;
        uint256 unlockTime;
        bool withdrawn;
    }

    Lock[] public locks;
    mapping(address => uint256[]) public userLockIds;

    event Locked(uint256 indexed lockId, address indexed token, address indexed owner, uint256 amount, uint256 unlockTime);
    event Withdrawn(uint256 indexed lockId, address indexed token, address indexed owner, uint256 amount);

    function lockToken(
        address _token,
        address _owner,
        uint256 _amount,
        uint256 _unlockTime
    ) external nonReentrant returns (uint256 lockId) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_unlockTime > block.timestamp, "Unlock time must be in future");
        require(_owner != address(0), "Owner cannot be zero address");

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        lockId = locks.length;
        locks.push(Lock({
            token: _token,
            owner: _owner,
            amount: _amount,
            lockTime: block.timestamp,
            unlockTime: _unlockTime,
            withdrawn: false
        }));

        userLockIds[_owner].push(lockId);

        emit Locked(lockId, _token, _owner, _amount, _unlockTime);
    }

    function withdraw(uint256 _lockId) external nonReentrant {
        require(_lockId < locks.length, "Invalid lock ID");
        Lock storage lock = locks[_lockId];
        require(msg.sender == lock.owner, "Not lock owner");
        require(block.timestamp >= lock.unlockTime, "Tokens are still locked");
        require(!lock.withdrawn, "Tokens already withdrawn");

        lock.withdrawn = true;
        IERC20(lock.token).safeTransfer(lock.owner, lock.amount);

        emit Withdrawn(_lockId, lock.token, lock.owner, lock.amount);
    }

    function getLocksByOwner(address _owner) external view returns (uint256[] memory) {
        return userLockIds[_owner];
    }

    function getLock(uint256 _lockId) external view returns (
        address token,
        address owner,
        uint256 amount,
        uint256 lockTime,
        uint256 unlockTime,
        bool withdrawn
    ) {
        Lock storage lock = locks[_lockId];
        return (lock.token, lock.owner, lock.amount, lock.lockTime, lock.unlockTime, lock.withdrawn);
    }
}
