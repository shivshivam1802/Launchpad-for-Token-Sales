// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    event ReceivedNative(address indexed from, uint256 amount);
    event WithdrawNative(address indexed to, uint256 amount);
    event WithdrawToken(address indexed token, address indexed to, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {
        emit ReceivedNative(msg.sender, msg.value);
    }

    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "insufficient native balance");
        to.transfer(amount);
        emit WithdrawNative(to, amount);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        require(IERC20(token).balanceOf(address(this)) >= amount, "insufficient token balance");
        IERC20(token).safeTransfer(to, amount);
        emit WithdrawToken(token, to, amount);
    }
}
