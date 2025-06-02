from web3 import Web3
import json
from dotenv import load_dotenv
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get sensitive data from .env file
infura_project_id = os.getenv("INFURA_PROJECT_ID")
private_key = os.getenv("PRIVATE_KEY")
contract_address = os.getenv("CONTRACT_ADDRESS")

# Validate environment variables
if not all([infura_project_id, private_key, contract_address]):
    logger.error("Missing environment variables: INFURA_PROJECT_ID, PRIVATE_KEY, or CONTRACT_ADDRESS")
    raise Exception("Missing required environment variables")

# Connect to Sepolia testnet
infura_url = f"https://sepolia.infura.io/v3/{infura_project_id}"
logger.info(f"Attempting to connect to: {infura_url}")
web3 = Web3(Web3.HTTPProvider(infura_url))

# Check connection
if not web3.is_connected():
    logger.error("Connection failed. Check Infura project ID and network connectivity.")
    raise Exception("Failed to connect to Sepolia testnet")
logger.info(f"Connected to Sepolia. Chain ID: {web3.eth.chain_id}")

# Load contract ABI
abi_path = "C:/Projects/ForensicToolProject/build/contracts/EvidenceStorage.json"
try:
    with open(abi_path, "r") as f:
        contract_json = json.load(f)
    contract_abi = contract_json["abi"]
except FileNotFoundError:
    logger.error(f"ABI file not found at {abi_path}")
    raise Exception(f"ABI file not found at {abi_path}")

# Initialize contract
contract = web3.eth.contract(address=contract_address, abi=contract_abi)

# Set up account
try:
    account = web3.eth.account.from_key(private_key)
    web3.eth.default_account = account.address
except Exception as e:
    logger.error(f"Invalid private key: {str(e)}")
    raise Exception("Invalid private key")

# Function to store evidence on the blockchain
def store_evidence(evidence_data):
    try:
        # Parse JSON evidence
        evidence = json.loads(evidence_data)
        post_id = evidence.get('id', '')
        content = evidence.get('text', '')
        author = evidence.get('author_username', '')

        if not all([post_id, content, author]):
            logger.error("Missing required fields in evidence data")
            raise Exception("Missing required fields: id, text, or author_username")

        # Build transaction
        nonce = web3.eth.get_transaction_count(account.address)
        tx = contract.functions.storeEvidence(post_id, content, author).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 2000000,
            "gasPrice": web3.to_wei("20", "gwei")
        })
        
        # Sign and send transaction
        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for transaction receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        # Try to get evidence_id from event (if defined in contract)
        evidence_id = None
        try:
            event = contract.events.EvidenceStored().process_receipt(receipt)
            if event:
                evidence_id = event[0]['args']['evidenceId']
                logger.info(f"Extracted evidence_id: {evidence_id}")
        except Exception:
            # Fallback: Assume evidence_id is the count of stored evidence
            try:
                evidence_count = contract.functions.getEvidenceCount().call()
                evidence_id = evidence_count - 1  # Last stored ID
                logger.info(f"Fallback evidence_id: {evidence_id}")
            except Exception as e:
                logger.warning(f"Could not determine evidence_id: {str(e)}")

        logger.info(f"Evidence stored with tx hash: {receipt.transactionHash.hex()}")
        return {
            "receipt": receipt,
            "evidence_id": evidence_id
        }
    except Exception as e:
        logger.error(f"Error storing evidence: {str(e)}")
        return None

# Function to retrieve evidence from the blockchain
def get_evidence(evidence_id):
    try:
        evidence = contract.functions.getEvidence(evidence_id).call()
        logger.info(f"Retrieved evidence ID {evidence_id}: {evidence}")
        return evidence
    except Exception as e:
        logger.error(f"Error retrieving evidence ID {evidence_id}: {str(e)}")
        return None