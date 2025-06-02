// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract EvidenceStorage {
    struct Evidence {
        string hash;
        string timestamp;
        string investigator;
    }

    Evidence[] public evidences;

    function storeEvidence(string memory _hash, string memory _timestamp, string memory _investigator) public {
        evidences.push(Evidence(_hash, _timestamp, _investigator));
    }

    function getEvidence(uint index) public view returns (string memory, string memory, string memory) {
        Evidence memory ev = evidences[index];
        return (ev.hash, ev.timestamp, ev.investigator);
    }

    function getEvidenceCount() public view returns (uint) {
        return evidences.length;
    }
}