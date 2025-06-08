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
    raise ValueError("Missing required environment variables")

# Connect to Sepolia testnet
infura_url = f"https://sepolia.infura.io/v3/{infura_project_id}"
logger.info(f"Attempting to connect to: {infura_url}")
web3 = Web3(Web3.HTTPProvider(infura_url))

# Check connection
if not web3.is_connected():
    logger.error("Error connecting to Sepolia. Check Infura project ID and network connectivity.")
    raise Exception("Failed to connect to Sepolia testnet")
logger.info(f"Connected to Sepolia. Chain ID: {web3.eth.chain_id}")

# Load contract ABI
abi_path = "C:/Projects/ForensicToolProject/build/contracts/EvidenceStorage.json"
try:
    with open(abi_path, "r") as f:
        contract_json = json.load(f)
    contract_abi = contract_json["abi"]
except FileNotFoundError as e:
    logger.error(f"ABI file not found at {abi_path}: {str(e)}")
    raise FileNotFoundError(f"ABI file not found at {abi_path}. Ensure EvidenceStorage.json exists in build/contracts.")
except Exception as e:
    logger.error(f"Failed to load ABI at {abi_path}: {str(e)}")
    raise Exception(f"Failed to load ABI file at {abi_path}")

# Initialize contract
try:
    contract = web3.eth.contract(address=contract_address, abi=contract_abi)
except Exception as e:
    logger.error(f"Invalid contract address or ABI: {str(e)}")
    raise ValueError(f"Invalid contract address or ABI")

# Set up account
try:
    account = web3.eth.account.from_key(private_key)
    web3.eth.default_account = account.address
    logger.info(f"Using account: {account.address}")
except Exception as e:
    logger.error(f"Invalid private key: {str(e)}")
    raise Exception("Invalid private key")

# Function to store evidence on the blockchain
def store_evidence(evidence_data):
    try:
        # Parse JSON evidence
        if isinstance(evidence_data, str):
            evidence = json.loads(evidence_data)
        else:
            evidence = evidence_data

        if not isinstance(evidence, dict):
            logger.error(f"Invalid evidence data type: {type(evidence)}")
            raise ValueError("Evidence data must be a dictionary or valid JSON string")

        post_id = evidence.get('id', '')
        content = evidence.get('text', '')
        author = evidence.get('author_username', '')

        if not all([post_id, content, author]):
            logger.error("Missing evidence data fields")
            raise ValueError("Evidence must include id, text, and author_username")

        # Build transaction
        nonce = web3.eth.get_transaction_count(account.address)
        tx = contract.functions.storeEvidence(post_id, content, author).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 3000000,
            "gasPrice": web3.to_wei("30", "gwei"),
            "chainId": 11155111  # Sepolia chain ID
        })
        
        # Sign and send transaction
        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        logger.info(f"Sent transaction: {tx_hash.hex()}")
        
        # Wait for transaction receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        # Try to get evidence_id from event
        evidence_id = None
        try:
            event = contract.events.EvidenceStored().process_receipt(receipt)
            if event:
                evidence_id = event[0]['args']['evidenceId']
                logger.info(f"Extracted evidence_id: {evidence_id}")
        except Exception:
            # Fallback: Use evidence count
            try:
                evidence_count = contract.functions.getEvidenceCount().call()
                evidence_id = evidence_count - 1
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
        raise

# Function to retrieve evidence from the blockchain
def get_evidence(evidence_id):
    try:
        evidence = contract.functions.getEvidence(evidence_id).call()
        logger.info(f"Retrieved evidence ID {evidence_id}: {evidence}")
        if evidence and evidence[0]:
            return {
                "id": evidence[0],  # post_id
                "text": evidence[1],  # content
                "author_username": evidence[2]  # author
            }
        logger.warning(f"No evidence found for ID {evidence_id}")
        return None
    except Exception as e:
        logger.error(f"Error retrieving evidence ID {evidence_id}: {str(e)}")
        raise

# Function to fetch evidence ID by transaction hash
def get_evidence_id_by_tx_hash(tx_hash):
    try:
        # Ensure tx_hash is valid hex
        if not tx_hash.startswith('0x'):
            tx_hash = '0x' + tx_hash
        receipt = web3.eth.get_transaction_receipt(tx_hash)
        if not receipt:
            logger.error(f"No receipt found for transaction hash: {tx_hash}")
            raise ValueError(f"No transaction found for hash: {tx_hash}")
        
        # Parse EvidenceStored event
        event = contract.events.EvidenceStored().process_receipt(receipt)
        if not event:
            logger.error(f"No EvidenceStored event in transaction: {tx_hash}")
            raise ValueError(f"No evidence stored in transaction: {tx_hash}")
        
        evidence_id = event[0]['args']['evidenceId']
        logger.info(f"Retrieved evidence ID {evidence_id} for tx hash: {tx_hash}")
        return evidence_id
    except Exception as e:
        logger.error(f"Error retrieving evidence ID for tx hash: {tx_hash}: {str(e)}")
        raise