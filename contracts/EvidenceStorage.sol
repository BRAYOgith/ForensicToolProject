// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceStorage {
    struct Evidence {
        bytes32 evidenceHash; // Changed to bytes32 for efficiency and consistency
        string timestamp;
        string investigator;
        string content;
        string authorUsername;
        string platform;
        string category;
        string engagementMetrics;
        string[] mediaUrls;
        uint256 confidence;
        string justification;
    }

    Evidence[] public evidenceArray;
    mapping(bytes32 => uint256) public txHashToEvidenceId;
    uint256 public evidenceCount;

    event EvidenceStored(
        uint256 indexed index, 
        bytes32 indexed txHash, 
        string investigator
    );

    function storeEvidence(
        bytes32 _evidenceHash,
        string memory _timestamp,
        string memory _investigator,
        string memory _content,
        string memory _authorUsername,
        string memory _platform,
        string memory _category,
        string memory _engagementMetrics,
        string[] memory _mediaUrls,
        uint256 _confidence,
        string memory _justification
    ) public {
        uint256 index = evidenceCount;
        evidenceArray.push(Evidence({
            evidenceHash: _evidenceHash,
            timestamp: _timestamp,
            investigator: _investigator,
            content: _content,
            authorUsername: _authorUsername,
            platform: _platform,
            category: _category,
            engagementMetrics: _engagementMetrics,
            mediaUrls: _mediaUrls,
            confidence: _confidence,
            justification: _justification
        }));

        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, evidenceCount));
        txHashToEvidenceId[txHash] = index;
        evidenceCount++;

        emit EvidenceStored(index, txHash, _investigator);
    }

    function getEvidence(uint256 _index) public view returns (
        bytes32 evidenceHash, // Changed type to bytes32
        string memory timestamp,
        string memory investigator,
        string memory content,
        string memory authorUsername,
        string memory platform,
        string memory category,
        string memory engagementMetrics,
        string[] memory mediaUrls,
        uint256 confidence,
        string memory justification
    ) {
        require(_index < evidenceCount, "Index out of bounds");
        Evidence memory e = evidenceArray[_index];
        return (
            e.evidenceHash,
            e.timestamp,
            e.investigator,
            e.content,
            e.authorUsername,
            e.platform,
            e.category,
            e.engagementMetrics,
            e.mediaUrls,
            e.confidence,
            e.justification
        );
    }

    function getEvidenceByTxHash(bytes32 txHash) public view returns (
        uint256 index,
        bytes32 evidenceHash, // Changed type to bytes32
        string memory timestamp,
        string memory investigator,
        string memory content,
        string memory authorUsername,
        string memory platform,
        string memory category,
        string memory engagementMetrics,
        string[] memory mediaUrls,
        uint256 confidence,
        string memory justification
    ) {
        uint256 evidenceIndex = txHashToEvidenceId[txHash];
        require(evidenceIndex < evidenceCount, "Evidence not found");
        Evidence memory e = evidenceArray[evidenceIndex];
        return (
            evidenceIndex,
            e.evidenceHash,
            e.timestamp,
            e.investigator,
            e.content,
            e.authorUsername,
            e.platform,
            e.category,
            e.engagementMetrics,
            e.mediaUrls,
            e.confidence,
            e.justification
        );
    }
}
