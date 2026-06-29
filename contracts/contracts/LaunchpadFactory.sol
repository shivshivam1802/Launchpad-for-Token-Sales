// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TokenSale.sol";

contract LaunchpadFactory is Ownable {
    address[] public allSales;
    mapping(address => address[]) public projectSales; // projectOwner => sales

    address public stakingContract;
    address public referralContract;
    address public vestingContract;
    address public liquidityLocker;
    address public platformTreasury;

    event SaleCreated(
        address indexed saleAddress,
        address indexed projectOwner,
        address indexed saleToken,
        address acceptedToken,
        uint256 hardCap,
        uint256 startTime
    );

    constructor(
        address _stakingContract,
        address _referralContract,
        address _vestingContract,
        address _liquidityLocker,
        address _platformTreasury
    ) Ownable(msg.sender) {
        stakingContract = _stakingContract;
        referralContract = _referralContract;
        vestingContract = _vestingContract;
        liquidityLocker = _liquidityLocker;
        platformTreasury = _platformTreasury;
    }

    function createSale(
        TokenSale.SaleConfig calldata _config,
        TokenSale.VestingConfig calldata _vestingConfig
    ) external returns (address saleAddress) {
        // Deploy a new TokenSale contract
        TokenSale newSale = new TokenSale(
            msg.sender, // Project owner is the creator
            _config,
            _vestingConfig,
            stakingContract,
            referralContract,
            vestingContract,
            liquidityLocker,
            platformTreasury
        );

        saleAddress = address(newSale);
        allSales.push(saleAddress);
        projectSales[msg.sender].push(saleAddress);

        // Ownership of TokenSale is transferred to the launchpad factory owner (Platform Admin)
        // to control emergency parameters, while project owner holds projectOwner role
        newSale.transferOwnership(owner());

        emit SaleCreated(
            saleAddress,
            msg.sender,
            _config.saleToken,
            _config.acceptedToken,
            _config.hardCap,
            _config.startTime
        );
    }

    function updateDependencies(
        address _stakingContract,
        address _referralContract,
        address _vestingContract,
        address _liquidityLocker,
        address _platformTreasury
    ) external onlyOwner {
        stakingContract = _stakingContract;
        referralContract = _referralContract;
        vestingContract = _vestingContract;
        liquidityLocker = _liquidityLocker;
        platformTreasury = _platformTreasury;
    }

    function getAllSales() external view returns (address[] memory) {
        return allSales;
    }

    function getProjectSales(address _projectOwner) external view returns (address[] memory) {
        return projectSales[_projectOwner];
    }
}
