from web3 import Web3
import json
from dotenv import load_dotenv
import os
import logging
import hashlib
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

infura_project_id = os.getenv("INFURA_PROJECT_ID")
private_key = os.getenv("PRIVATE_KEY")
contract_address = os.getenv("CONTRACT_ADDRESS")
wallet_address = os.getenv("WALLET_ADDRESS")

missing_vars = []
if not infura_project_id:
    missing_vars.append("INFURA_PROJECT_ID")
if not private_key:
    missing_vars.append("PRIVATE_KEY")
if not contract_address:
    missing_vars.append("CONTRACT_ADDRESS")
if not wallet_address:
    missing_vars.append("WALLET_ADDRESS")

if missing_vars:
    logger.error(f"Missing environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

infura_url = infura_project_id if infura_project_id.startswith("http") else f"https://sepolia.infura.io/v3/{infura_project_id}"
logger.info(f"Connecting to: {infura_url}")

session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))

blockchain_available = False
web3 = None
contract = None
account = None

try:
    web3 = Web3(Web3.HTTPProvider(infura_url, session=session))
    if web3.is_connected():
        logger.info(f"Connected to Sepolia. Chain ID: {web3.eth.chain_id}")
        
        if not web3.is_address(contract_address):
            logger.error(f"Invalid contract address: {contract_address}")
        else:
            blockchain_available = True
            logger.info("Blockchain service is ACTIVE")
    else:
        logger.warning("Could not connect to Sepolia testnet. Blockchain features will be DISABLED.")
except Exception as e:
    logger.error(f"Blockchain initialization failed: {e}. Blockchain features will be DISABLED.")

# contract_abi is defined below, so contract and account setup must happen after it.
# This block will be executed only if blockchain_available is True after initial connection check.
# The actual contract and account setup will be moved after contract_abi definition.

contract_abi = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "index", "type": "uint256"},
            {"indexed": True, "internalType": "bytes32", "name": "txHash", "type": "bytes32"},
            {"indexed": False, "internalType": "string", "name": "category", "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "confidence", "type": "uint256"}
        ],
        "name": "EvidenceStored",
        "type": "event"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "evidenceArray",
        "outputs": [
            {"internalType": "string", "name": "hash", "type": "string"},
            {"internalType": "string", "name": "timestamp", "type": "string"},
            {"internalType": "string", "name": "investigator", "type": "string"},
            {"internalType": "string", "name": "content", "type": "string"},
            {"internalType": "string", "name": "author_username", "type": "string"},
            {"internalType": "string", "name": "platform", "type": "string"},
            {"internalType": "string", "name": "category", "type": "string"},
            {"internalType": "string", "name": "engagementMetrics", "type": "string"},
            {"internalType": "uint256", "name": "confidence", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "evidenceCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_index", "type": "uint256"}],
        "name": "getEvidence",
        "outputs": [
            {"internalType": "string", "name": "hash", "type": "string"},
            {"internalType": "string", "name": "timestamp", "type": "string"},
            {"internalType": "string", "name": "investigator", "type": "string"},
            {"internalType": "string", "name": "content", "type": "string"},
            {"internalType": "string", "name": "author_username", "type": "string"},
            {"internalType": "string", "name": "platform", "type": "string"},
            {"internalType": "string", "name": "category", "type": "string"},
            {"internalType": "string", "name": "engagementMetrics", "type": "string"},
            {"internalType": "string[]", "name": "mediaUrls", "type": "string[]"},
            {"internalType": "uint256", "name": "confidence", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "txHash", "type": "bytes32"}],
        "name": "getEvidenceByTxHash",
        "outputs": [
            {"internalType": "uint256", "name": "index", "type": "uint256"},
            {"internalType": "string", "name": "hash", "type": "string"},
            {"internalType": "string", "name": "timestamp", "type": "string"},
            {"internalType": "string", "name": "investigator", "type": "string"},
            {"internalType": "string", "name": "content", "type": "string"},
            {"internalType": "string", "name": "author_username", "type": "string"},
            {"internalType": "string", "name": "platform", "type": "string"},
            {"internalType": "string", "name": "category", "type": "string"},
            {"internalType": "string", "name": "engagementMetrics", "type": "string"},
            {"internalType": "string[]", "name": "mediaUrls", "type": "string[]"},
            {"internalType": "uint256", "name": "confidence", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_hash", "type": "string"},
            {"internalType": "string", "name": "_timestamp", "type": "string"},
            {"internalType": "string", "name": "_investigator", "type": "string"},
            {"internalType": "string", "name": "_content", "type": "string"},
            {"internalType": "string", "name": "_author_username", "type": "string"},
            {"internalType": "string", "name": "_platform", "type": "string"},
            {"internalType": "string", "name": "_category", "type": "string"},
            {"internalType": "string", "name": "_engagementMetrics", "type": "string"},
            {"internalType": "string[]", "name": "_mediaUrls", "type": "string[]"},
            {"internalType": "uint256", "name": "_confidence", "type": "uint256"}
        ],
        "name": "storeEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "name": "txHashToEvidenceId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

if blockchain_available:
    try:
        contract = web3.eth.contract(
            address=web3.to_checksum_address(contract_address),
            abi=contract_abi
        )
        account = web3.eth.account.from_key(private_key)
        if account.address.lower() != wallet_address.lower():
            logger.error("Private key does not match WALLET_ADDRESS")
            blockchain_available = False
        else:
            web3.eth.default_account = account.address
            logger.info(f"Using account: {account.address}")
    except Exception as e:
        logger.error(f"Contract/Account setup failed: {e}")
        blockchain_available = False

def generate_evidence_hash(content, author_username, post_id, timestamp):
    try:
        if not all([content, author_username, str(post_id), timestamp]):
            logger.error("Missing fields for hash generation")
            raise ValueError("All fields required")
        data_string = f"{content}{author_username}{str(post_id)}{timestamp}"
        hash_value = hashlib.sha256(data_string.encode('utf-8')).hexdigest()
        return hash_value
    except Exception as e:
        logger.error(f"Error generating hash: {str(e)}")
        return None

def store_evidence(evidence_data):
    if not blockchain_available:
        logger.error("store_evidence failed: Blockchain service is unavailable.")
        return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None, "error": "Blockchain service unavailable"}
    
    try:
        if isinstance(evidence_data, str):
            evidence = json.loads(evidence_data)
        else:
            evidence = evidence_data

        if not isinstance(evidence, dict):
            logger.error("Evidence must be dict or JSON string")
            return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        content = evidence.get("content", "")
        author_username = evidence.get("author_username", "")
        post_id = evidence.get("id") or evidence.get("hash", "")
        timestamp = evidence.get("timestamp", "")
        investigator = evidence.get("investigator", "")
        media_urls = evidence.get("mediaUrls", [])
        platform = evidence.get("platform", "Unknown")
        
        # Extract AI defamation results
        defamation = evidence.get("defamation", {})
        category = defamation.get("category", "Safe")
        confidence_score = defamation.get("confidence", 0.0)
        scaled_confidence = int(confidence_score * 10000)

        # Engagement metrics
        engagement = evidence.get("engagement", {})
        engagement_json = json.dumps(engagement)

        if not isinstance(media_urls, list):
            media_urls = []

        hash_value = generate_evidence_hash(content, author_username, post_id, timestamp)
        if not hash_value:
            logger.error("Failed to generate hash_value")
            return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        if not all([hash_value, timestamp, investigator]):
            logger.error(f"Missing required fields - hash: {bool(hash_value)}, timestamp: {bool(timestamp)}, investigator: {bool(investigator)}")
            return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        try:
            gas_estimate = contract.functions.storeEvidence(
                hash_value,
                timestamp,
                investigator,
                content,
                author_username,
                platform,
                category,
                engagement_json,
                media_urls,
                scaled_confidence
            ).estimate_gas({"from": account.address})
            gas_limit = int(gas_estimate * 1.5)
        except Exception as gas_err:
            logger.warning(f"Gas estimation failed: {gas_err}")
            gas_limit = 1500000

        nonce = web3.eth.get_transaction_count(account.address, 'pending')
        tx = contract.functions.storeEvidence(
            hash_value,
            timestamp,
            investigator,
            content,
            author_username,
            platform,
            category,
            engagement_json,
            media_urls,
            scaled_confidence
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "gasPrice": web3.to_wei("25", "gwei"),
            "chainId": 11155111
        })

        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        eth_tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = web3.eth.wait_for_transaction_receipt(eth_tx_hash, timeout=300)
        
        if receipt.status == 0:
            return {"receipt": receipt, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": eth_tx_hash.hex()}

        try:
            events = contract.events.EvidenceStored().process_receipt(receipt)
            if events:
                evidence_id = events[0]["args"]["index"]
                event_tx_hash = events[0]["args"]["txHash"].hex()
                if not event_tx_hash.startswith("0x"):
                    event_tx_hash = f"0x{event_tx_hash}"
                return {
                    "receipt": receipt,
                    "evidence_id": evidence_id,
                    "tx_hash": event_tx_hash,
                    "eth_tx_hash": eth_tx_hash.hex()
                }
        except Exception as e:
            logger.error(f"Event parsing error: {e}")

        return {"receipt": receipt, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": eth_tx_hash.hex()}

    except Exception as e:
        logger.error(f"store_evidence error: {str(e)}")
        return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

def get_evidence(index):
    if not blockchain_available:
        return None
    try:
        res = contract.functions.getEvidence(index).call()
        if res and res[0]:
            return {
                "hash": res[0],
                "timestamp": res[1],
                "investigator": res[2],
                "content": res[3],
                "author_username": res[4],
                "platform": res[5],
                "category": res[6],
                "engagement": json.loads(res[7]),
                "mediaUrls": res[8],
                "confidence": res[9] / 10000.0
            }
        return None
    except Exception as e:
        logger.error(f"get_evidence error: {str(e)}")
        return None

def get_evidence_by_tx_hash(tx_hash):
    if not blockchain_available:
        return None
    try:
        if not tx_hash or not tx_hash.startswith('0x') or len(tx_hash) != 66:
            return None
        tx_hash_bytes = bytes.fromhex(tx_hash[2:])
        res = contract.functions.getEvidenceByTxHash(tx_hash_bytes).call()
        if res and res[1]:
            return {
                "evidence_id": res[0],
                "hash": res[1],
                "timestamp": res[2],
                "investigator": res[3],
                "content": res[4],
                "author_username": res[5],
                "platform": res[6],
                "category": res[7],
                "engagement": json.loads(res[8]),
                "mediaUrls": res[9],
                "confidence": res[10] / 10000.0
            }
        return None
    except Exception as e:
        logger.error(f"get_evidence_by_tx_hash error: {str(e)}")
        return None
