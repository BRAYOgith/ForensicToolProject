const HDWalletProvider = require("@truffle/hdwallet-provider");
require('dotenv').config();

module.exports = {
  networks: {
    sepolia: {
      provider: () => new HDWalletProvider({
        privateKeys: [process.env.PRIVATE_KEY],
        providerOrUrl: process.env.INFURA_PROJECT_ID || "https://sepolia.infura.io/v3/c7d14c975dff45318e86a61f0012fdb6",
        pollingInterval: 15000 // 15 seconds
      }),
      network_id: 11155111,
      gas: 6000000,
      gasPrice: 20000000000, // 20 Gwei
      networkCheckTimeout: 60000, // 60 seconds
      timeoutBlocks: 200,
      skipDryRun: true,
      confirmations: 2 // Wait for 2 confirmations
    }
  },
  compilers: {
    solc: {
      version: "0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  contracts_build_directory: './build/contracts'
};