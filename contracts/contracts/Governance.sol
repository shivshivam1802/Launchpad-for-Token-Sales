// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";

contract Governance is Ownable {
    enum ProposalState { Active, Succeeded, Defeated, Executed }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    // Array of all proposals
    Proposal[] public proposals;
    address public stakingContract;
    uint256 public proposalCount;
    uint256 public constant VOTING_DELAY = 1; // 1 block delay
    uint256 public votingPeriodBlocks = 100;  // 100 blocks (~20 minutes)
    uint256 public quorumBps = 400;           // 4% quorum (basis points)

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 endTime);
    event Voted(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _stakingContract) Ownable(msg.sender) {
        stakingContract = _stakingContract;
    }

    function propose(string calldata _description) external returns (uint256 proposalId) {
        // Proposer must have staked balance in Staking contract to create proposal
        require(stakingContract != address(0), "Staking contract not set");
        (uint256 stakedAmount, , ) = Staking(stakingContract).userInfo(msg.sender);
        require(stakedAmount >= 1000 * 10**18, "Proposer staked amount too low (min 1000 LAUNCH)");

        proposalId = proposals.length;
        
        Proposal storage newProposal = proposals.push();
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.startTime = block.number + VOTING_DELAY;
        newProposal.endTime = block.number + VOTING_DELAY + votingPeriodBlocks;
        newProposal.forVotes = 0;
        newProposal.againstVotes = 0;
        newProposal.executed = false;

        proposalCount++;

        emit ProposalCreated(proposalId, msg.sender, _description, newProposal.endTime);
    }

    function castVote(uint256 _proposalId, bool _support) external {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(block.number >= proposal.startTime, "Voting has not started");
        require(block.number <= proposal.endTime, "Voting has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted on this proposal");

        (uint256 votingWeight, , ) = Staking(stakingContract).userInfo(msg.sender);
        require(votingWeight > 0, "No voting power (0 staked balance)");

        proposal.hasVoted[msg.sender] = true;

        if (_support) {
            proposal.forVotes += votingWeight;
        } else {
            proposal.againstVotes += votingWeight;
        }

        emit Voted(msg.sender, _proposalId, _support, votingWeight);
    }

    function executeProposal(uint256 _proposalId) external {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(block.number > proposal.endTime, "Voting has not ended yet");
        require(!proposal.executed, "Proposal already executed");
        
        ProposalState state = getProposalState(_proposalId);
        require(state == ProposalState.Succeeded, "Proposal did not succeed");

        proposal.executed = true;
        // In a real DAO, this would execute proposal actions. We mark it executed here.
        emit ProposalExecuted(_proposalId);
    }

    function getProposalState(uint256 _proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        if (block.number <= proposal.endTime) {
            return ProposalState.Active;
        }

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalStaked = Staking(stakingContract).stakingToken().balanceOf(stakingContract);
        uint256 quorumVotes = (totalStaked * quorumBps) / 10000;

        if (totalVotes < quorumVotes) {
            return ProposalState.Defeated;
        }

        if (proposal.forVotes > proposal.againstVotes) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    function getProposalDetails(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.executed
        );
    }

    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return proposals[_proposalId].hasVoted[_voter];
    }

    function setVotingPeriod(uint256 _blocks) external onlyOwner {
        votingPeriodBlocks = _blocks;
    }

    function setQuorum(uint256 _bps) external onlyOwner {
        require(_bps <= 5000, "Quorum limit is 50%");
        quorumBps = _bps;
    }
}
