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

if not web3.is_address(contract_address):
    logger.error(f"Invalid contract address: {contract_address}")
    raise ValueError("Invalid CONTRACT_ADDRESS")

abi_path = "build/contracts/EvidenceStorage.json"
try:
    with open(abi_path, "r") as f:
        contract_json = json.load(f)
        contract_abi = contract_json["abi"]
except Exception as e:
    logger.error(f"Error loading ABI: {str(e)}")
    raise

contract = web3.eth.contract(
    address=web3.to_checksum_address(contract_address),
    abi=contract_abi
)

account = web3.eth.account.from_key(private_key)
if account.address.lower() != wallet_address.lower():
    logger.error("Private key does not match WALLET_ADDRESS")
    raise ValueError("Private key does not match WALLET_ADDRESS")
web3.eth.default_account = account.address
logger.info(f"Using account: {account.address}")

def generate_evidence_hash(content, author_username, post_id, timestamp):
    try:
        if not all([content, author_username, post_id, timestamp]):
            logger.error("Missing fields for hash generation")
            raise ValueError("All fields required")
        data_string = f"{content}{author_username}{str(post_id)}{timestamp}"
        hash_value = hashlib.sha256(data_string.encode('utf-8')).hexdigest()
        return hash_value
    except Exception as e:
        logger.error(f"Error generating hash: {str(e)}")
        return None

def store_evidence(evidence_data):
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
        post_id = evidence.get("hash", evidence.get("post_id", ""))  # Accept both
        timestamp = evidence.get("timestamp", "")
        investigator = evidence.get("investigator", "")
        media_urls = evidence.get("mediaUrls", [])

        # Use provided hash if exists, otherwise generate
        hash_value = evidence.get("hash", "")
        if not hash_value:
            hash_value = generate_evidence_hash(content, author_username, post_id, timestamp)
            if not hash_value:
                return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        if not all([hash_value, timestamp, investigator]):
            logger.error("Missing required fields")
            return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None}

        if not isinstance(media_urls, list):
            media_urls = []

        try:
            gas_estimate = contract.functions.storeEvidence(
                hash_value, timestamp, investigator, content, author_username, media_urls
            ).estimate_gas({"from": account.address})
            gas_limit = int(gas_estimate * 1.2)
        except:
            gas_limit = 3000000

        nonce = web3.eth.get_transaction_count(account.address)
        tx = contract.functions.storeEvidence(
            hash_value, timestamp, investigator, content, author_username, media_urls
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "gasPrice": web3.to_wei("20", "gwei"),
            "chainId": 11155111
        })

        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        eth_tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        logger.info(f"Sent tx: {eth_tx_hash.hex()}")

        receipt = web3.eth.wait_for_transaction_receipt(eth_tx_hash, timeout=120)
        if receipt.status == 0:
            logger.error("Transaction failed")
            return {"receipt": receipt, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": eth_tx_hash.hex()}

        try:
            events = contract.events.EvidenceStored().process_receipt(receipt)
            if events:
                evidence_id = events[0]["args"]["index"]
                event_tx_hash = events[0]["args"]["txHash"].hex()
                logger.info(f"Success - Evidence ID: {evidence_id}")
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
    try:
        if index < 0:
            return None
        evidence = contract.functions.getEvidence(index).call()
        if evidence and evidence[0]:
            return {
                "hash": evidence[0],
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
                "hash": evidence[1],
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
