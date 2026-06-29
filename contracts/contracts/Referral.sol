// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Referral is Ownable {
    // Referrals mapping: user => referrer
    mapping(address => address) public referrers;
    // Referral counts: user => total referred
    mapping(address => uint256) public referralCounts;
    // Total rewards paid: user => amount of reward (tracked in USD/ETH equivalents)
    mapping(address => mapping(address => uint256)) public referralRewards; // user => tokenAddress => rewards

    // Multi-level commission rate in Basis Points (bps) (e.g. 500 = 5%, 200 = 2%)
    uint256[] public levelCommissionRates;

    event ReferrerRegistered(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed referrer, address indexed user, address token, uint256 amount, uint256 level);
    event CommissionRatesUpdated(uint256[] rates);

    constructor() Ownable(msg.sender) {
        // Set default 2 levels of referral commissions: Level 1 = 5%, Level 2 = 2%
        levelCommissionRates.push(500); // 5%
        levelCommissionRates.push(200); // 2%
    }

    function recordReferral(address _user, address _referrer) external {
        require(_user != address(0), "User cannot be zero address");
        require(_referrer != address(0), "Referrer cannot be zero address");
        require(_user != _referrer, "Cannot refer yourself");
        
        // Referrer registration only happens once
        if (referrers[_user] == address(0) && referrers[_referrer] != _user) {
            referrers[_user] = _referrer;
            referralCounts[_referrer]++;
            emit ReferrerRegistered(_user, _referrer);
        }
    }

    function payCommission(
        address _user,
        address _token,
        uint256 _purchaseValue
    ) external returns (uint256 totalCommissionsPaid) {
        address currentReferrer = referrers[_user];
        uint256 levels = levelCommissionRates.length;
        
        for (uint256 i = 0; i < levels; i++) {
            if (currentReferrer == address(0)) {
                break;
            }
            
            uint256 rate = levelCommissionRates[i];
            uint256 commission = (_purchaseValue * rate) / 10000;
            
            if (commission > 0) {
                referralRewards[currentReferrer][_token] += commission;
                totalCommissionsPaid += commission;
                emit CommissionPaid(currentReferrer, _user, _token, commission, i + 1);
            }
            
            currentReferrer = referrers[currentReferrer];
        }
    }

    function setCommissionRates(uint256[] calldata _rates) external onlyOwner {
        for (uint256 i = 0; i < _rates.length; i++) {
            require(_rates[i] <= 2000, "Commission cannot exceed 20%");
        }
        levelCommissionRates = _rates;
        emit CommissionRatesUpdated(_rates);
    }

    function getReferralInfo(address _user) external view returns (address referrer, uint256 referredCount) {
        return (referrers[_user], referralCounts[_user]);
    }
}
