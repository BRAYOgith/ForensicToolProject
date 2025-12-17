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
    }

    Evidence[] public evidenceArray;
    mapping(bytes32 => uint256) public txHashToEvidenceId;
    uint256 public evidenceCount;

    event EvidenceStored(uint256 indexed index, bytes32 indexed txHash);

    function storeEvidence(
        string memory _hash,
        string memory _timestamp,
        string memory _investigator,
        string memory _content,
        string memory _author_username,
        string[] memory _mediaUrls
    ) public {
        uint256 index = evidenceCount;
        evidenceArray.push(Evidence({
            hash: _hash,
            timestamp: _timestamp,
            investigator: _investigator,
            content: _content,
            author_username: _author_username,
            mediaUrls: _mediaUrls
        }));
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, evidenceCount));
        txHashToEvidenceId[txHash] = index;
        evidenceCount++;
        emit EvidenceStored(index, txHash);
    }

    function getEvidence(uint256 _index) public view returns (
        string memory hash,
        string memory timestamp,
        string memory investigator,
        string memory content,
        string memory author_username,
        string[] memory mediaUrls
    ) {
        require(_index < evidenceCount, "Index out of bounds");
        Evidence memory evidence = evidenceArray[_index];
        return (
            evidence.hash,
            evidence.timestamp,
            evidence.investigator,
            evidence.content,
            evidence.author_username,
            evidence.mediaUrls
        );
    }

    function getEvidenceByTxHash(bytes32 txHash) public view returns (
        uint256 index,
        string memory hash,
        string memory timestamp,
        string memory investigator,
        string memory content,
        string memory author_username,
        string[] memory mediaUrls
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
            evidence.mediaUrls
        );
    }
}