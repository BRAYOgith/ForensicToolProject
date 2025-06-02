const EvidenceStorage = artifacts.require("EvidenceStorage");

module.exports = function (deployer) {
  deployer.deploy(EvidenceStorage);
};