// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceStorage {
    struct Evidence {
        string hash;
        string timestamp;
        string investigator;
        string content;
        string author_username;
        string[] mediaUrls;
        bool isDefamatory;      // NEW: AI result - is the content defamatory?
        uint256 confidence;     // NEW: AI confidence score (scaled: 0.94 → 9400)
    }

    Evidence[] public evidenceArray;
    mapping(bytes32 => uint256) public txHashToEvidenceId;
    uint256 public evidenceCount;

    // Updated event to include AI result
    event EvidenceStored(
        uint256 indexed index,
        bytes32 indexed txHash,
        bool indexed isDefamatory,
        uint256 confidence
    );

    function storeEvidence(
        string memory _hash,
        string memory _timestamp,
        string memory _investigator,
        string memory _content,
        string memory _author_username,
        string[] memory _mediaUrls,
        bool _isDefamatory,      // NEW parameter
        uint256 _confidence      // NEW parameter (scaled: multiply by 10000 in backend)
    ) public {
        uint256 index = evidenceCount;
        evidenceArray.push(Evidence({
            hash: _hash,
            timestamp: _timestamp,
            investigator: _investigator,
            content: _content,
            author_username: _author_username,
            mediaUrls: _mediaUrls,
            isDefamatory: _isDefamatory,
            confidence: _confidence
        }));

        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, evidenceCount));
        txHashToEvidenceId[txHash] = index;
        evidenceCount++;

        emit EvidenceStored(index, txHash, _isDefamatory, _confidence);
    }

    function getEvidence(uint256 _index) public view returns (
        string memory hash,
        string memory timestamp,
        string memory investigator,
        string memory content,
        string memory author_username,
        string[] memory mediaUrls,
        bool isDefamatory,
        uint256 confidence
    ) {
        require(_index < evidenceCount, "Index out of bounds");
        Evidence memory evidence = evidenceArray[_index];
        return (
            evidence.hash,
            evidence.timestamp,
            evidence.investigator,
            evidence.content,
            evidence.author_username,
            evidence.mediaUrls,
            evidence.isDefamatory,
            evidence.confidence
        );
    }

    function getEvidenceByTxHash(bytes32 txHash) public view returns (
        uint256 index,
        string memory hash,
        string memory timestamp,
        string memory investigator,
        string memory content,
        string memory author_username,
        string[] memory mediaUrls,
        bool isDefamatory,
        uint256 confidence
    ) {
        uint256 evidenceIndex = txHashToEvidenceId[txHash];
        require(evidenceIndex < evidenceCount, "Evidence not found for transaction hash");
        Evidence memory evidence = evidenceArray[evidenceIndex];
        return (
            evidenceIndex,
            evidence.hash,
            evidence.timestamp,
            evidence.investigator,
            evidence.content,
            evidence.author_username,
            evidence.mediaUrls,
            evidence.isDefamatory,
            evidence.confidence
        );
    }
}
