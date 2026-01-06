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
web3 = Web3(Web3.HTTPProvider(infura_url, session=session))
if not web3.is_connected():
    logger.error("Could not connect to Sepolia testnet")
    raise Exception("Failed to connect to Sepolia")

logger.info(f"Connected to Sepolia. Chain ID: {web3.eth.chain_id}")

contract_abi = [
    {
        "inputs": [],
        "name": "evidenceCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "evidences",
        "outputs": [
            {"internalType": "bytes32", "name": "hash", "type": "bytes32"},
            {"internalType": "string", "name": "timestamp", "type": "string"},
            {"internalType": "string", "name": "investigator", "type": "string"},
            {"internalType": "string", "name": "content", "type": "string"},
            {"internalType": "string", "name": "author_username", "type": "string"},
            {"internalType": "string[]", "name": "mediaUrls", "type": "string[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "name": "txHashToIndex",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "evidenceHash", "type": "bytes32"},
            {"internalType": "string", "name": "timestamp", "type": "string"},
            {"internalType": "string", "name": "investigator", "type": "string"},
            {"internalType": "string", "name": "content", "type": "string"},
            {"internalType": "string", "name": "author_username", "type": "string"},
            {"internalType": "string[]", "name": "mediaUrls", "type": "string[]"}
        ],
        "name": "storeEvidence",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
        "name": "getEvidence",
        "outputs": [
            {"internalType": "bytes32", "name": "", "type": "bytes32"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string[]", "name": "", "type": "string[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "txHash", "type": "bytes32"}],
        "name": "getEvidenceByTxHash",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "bytes32", "name": "", "type": "bytes32"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string", "name": "", "type": "string"},
            {"internalType": "string[]", "name": "", "type": "string[]"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "index", "type": "uint256"},
            {"indexed": True, "internalType": "bytes32", "name": "txHash", "type": "bytes32"},
            {"indexed": False, "internalType": "bytes32", "name": "evidenceHash", "type": "bytes32"},
            {"indexed": False, "internalType": "string", "name": "timestamp", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "investigator", "type": "string"}
        ],
        "name": "EvidenceStored",
        "type": "event"
    }
]

contract = web3.eth.contract(
    address=web3.to_checksum_address(contract_address),
    abi=contract_abi
)

account = web3.eth.account.from_key(private_key)
web3.eth.default_account = account.address

def generate_evidence_hash(content, author_username, post_id, timestamp):
    try:
        if not all([content, author_username, post_id, timestamp]):
            logger.error("Missing fields for hash generation")
            return None
        data_string = f"{content}{author_username}{str(post_id)}{timestamp}"
        return hashlib.sha256(data_string.encode('utf-8')).hexdigest()
    except Exception as e:
        logger.error(f"Error generating hash: {str(e)}")
        return None

def store_evidence(evidence_data):
    try:
        evidence = json.loads(evidence_data) if isinstance(evidence_data, str) else evidence_data
        if not isinstance(evidence, dict):
            return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        content = evidence.get("content", "")
        author_username = evidence.get("author_username", "")
        post_id = evidence.get("hash", evidence.get("post_id", ""))
        timestamp = evidence.get("timestamp", "")
        investigator = evidence.get("investigator", "")
        media_urls = evidence.get("mediaUrls", [])

        hash_value = evidence.get("hash", "")
        is_valid_hex = isinstance(hash_value, str) and len(hash_value) == 64 and all(c in '0123456789abcdefABCDEF' for c in hash_value)
        
        if not is_valid_hex:
            hash_value = generate_evidence_hash(content, author_username, post_id, timestamp)
            if not hash_value:
                return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        if not all([hash_value, timestamp, investigator]):
            return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        if not isinstance(media_urls, list):
            media_urls = []

        try:
            gas_estimate = contract.functions.storeEvidence(
                web3.to_bytes(hexstr=hash_value), timestamp, investigator, content, author_username, media_urls
            ).estimate_gas({"from": account.address})
            gas_limit = int(gas_estimate * 1.2)
        except:
            gas_limit = 3000000

        nonce = web3.eth.get_transaction_count(account.address)
        tx = contract.functions.storeEvidence(
            web3.to_bytes(hexstr=hash_value), timestamp, investigator, content, author_username, media_urls
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "gasPrice": web3.to_wei("20", "gwei"),
            "chainId": 11155111
        })

        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        eth_tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = web3.eth.wait_for_transaction_receipt(eth_tx_hash, timeout=120)

        if receipt.status == 0:
            return {"receipt": receipt, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": eth_tx_hash.hex()}

        events = contract.events.EvidenceStored().process_receipt(receipt)
        if events:
            return {
                "receipt": receipt,
                "evidence_id": events[0]["args"]["index"],
                "tx_hash": events[0]["args"]["txHash"].hex(),
                "eth_tx_hash": eth_tx_hash.hex()
            }

        return {"receipt": receipt, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": eth_tx_hash.hex()}

    except Exception as e:
        logger.error(f"store_evidence error: {str(e)}")
        return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

def get_evidence(index):
    try:
        if index < 0: return None
        evidence = contract.functions.getEvidence(index).call()
        if evidence and evidence[0]:
            return {
                "hash": evidence[0].hex(),
                "timestamp": evidence[1],
                "investigator": evidence[2],
                "content": evidence[3],
                "author_username": evidence[4],
                "mediaUrls": evidence[5]
            }
        return None
    except Exception as e:
        logger.error(f"get_evidence error: {str(e)}")
        return None

def get_evidence_by_tx_hash(tx_hash):
    try:
        if not tx_hash or not tx_hash.startswith('0x') or len(tx_hash) != 66:
            return None
        tx_hash_bytes = bytes.fromhex(tx_hash[2:])
        evidence = contract.functions.getEvidenceByTxHash(tx_hash_bytes).call()
        if evidence and evidence[1]:
            return {
                "evidence_id": evidence[0],
                "hash": evidence[1].hex(),
                "timestamp": evidence[2],
                "investigator": evidence[3],
                "content": evidence[4],
                "author_username": evidence[5],
                "mediaUrls": evidence[6]
            }
        return None
    except Exception as e:
        logger.error(f"get_evidence_by_tx_hash error: {str(e)}")
        return None
