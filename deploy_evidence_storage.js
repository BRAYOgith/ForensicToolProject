// deploy_evidence_storage.js
// Deploys EvidenceStorage using compiled Truffle artifact + Web3 directly
require('dotenv').config();
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
    const infuraUrl = process.env.INFURA_PROJECT_ID;
    const privateKey = process.env.PRIVATE_KEY;

    if (!infuraUrl || !privateKey) {
        console.error('Missing INFURA_PROJECT_ID or PRIVATE_KEY in .env');
        process.exit(1);
    }

    const web3 = new Web3(infuraUrl);
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    console.log('Deployer address:', account.address);

    const balance = await web3.eth.getBalance(account.address);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');

    // Load Truffle compiled artifact
    const artifactPath = path.join(__dirname, 'build', 'contracts', 'EvidenceStorage.json');
    if (!fs.existsSync(artifactPath)) {
        console.error('Truffle artifact not found! Run `npx truffle compile` first.');
        process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    const bytecode = artifact.bytecode;

    console.log('Deploying EvidenceStorage to Sepolia...');

    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({ data: bytecode });

    const gasEstimate = await deployTx.estimateGas({ from: account.address });
    console.log('Gas estimate:', gasEstimate.toString());

    const deployedContract = await deployTx.send({
        from: account.address,
        gas: Math.ceil(Number(gasEstimate) * 1.5).toString(),
        gasPrice: web3.utils.toWei('25', 'gwei')
    });

    const contractAddress = deployedContract.options.address;
    console.log('\n========================================');
    console.log('CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('Contract Address:', contractAddress);
    console.log('========================================\n');

    // Update .env file with new contract address
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contractAddress}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log('.env updated with new CONTRACT_ADDRESS');
}

main().catch(err => {
    console.error('Deployment failed:', err.message || err);
    process.exit(1);
});
