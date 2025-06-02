# ForensicToolProject
A blockchain-enhanced forensic tool for social media investigations, built with React, Python, and Ethereum (Sepolia testnet).

## Setup
1. Clone the repository: `git clone https://github.com/BRAYOgith/ForensicToolProject.git`
2. Install frontend dependencies: `cd forensics-ui && npm install`
3. Set up Python environment: `python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt`
4. Configure blockchain: Create a `.env` file with `CONTRACT_ADDRESS` and wallet details (e.g., private key, Infura/Alchemy URL).

## Usage
- Run the backend: `python api.py`
- Run the frontend: `cd forensics-ui && npm start`
- Deploy smart contract: `truffle migrate --network sepolia`

## Project Structure
- `forensics-ui/`: React frontend with Tailwind CSS
- `api.py`: Flask backend for fetching social media posts
- `store_blockchain.py`: Script for blockchain evidence storage
- `contracts/`: Ethereum smart contracts (e.g., `EvidenceStorage.sol`)