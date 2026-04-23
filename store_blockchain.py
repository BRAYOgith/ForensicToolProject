from web3 import Web3
import json
from datetime import datetime
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

# ── Load ABI from Truffle build artifact (preferred) or inline fallback ──
def _load_abi():
    """Load the contract ABI from Hardhat build artifacts if available."""
    # Try Hardhat path first
    hardhat_artifact = os.path.join(os.path.dirname(__file__), 'artifacts', 'contracts', 'EvidenceStorage.sol', 'EvidenceStorage.json')
    if os.path.exists(hardhat_artifact):
        with open(hardhat_artifact, 'r') as f:
            artifact = json.load(f)
            logger.info("ABI loaded from Hardhat build artifact")
            return artifact['abi']
    
    # Try Truffle path
    truffle_artifact = os.path.join(os.path.dirname(__file__), 'build', 'contracts', 'EvidenceStorage.json')
    if os.path.exists(truffle_artifact):
        with open(truffle_artifact, 'r') as f:
            artifact = json.load(f)
            logger.info("ABI loaded from Truffle build artifact")
            return artifact['abi']
    
    # Fallback: inline ABI (matches EvidenceStorage.sol exactly)
    logger.warning("Truffle artifact not found, using inline ABI fallback")
    return json.loads('''[{"anonymous": false, "inputs": [{"indexed": true, "internalType": "uint256", "name": "index", "type": "uint256"}, {"indexed": true, "internalType": "bytes32", "name": "txHash", "type": "bytes32"}, {"indexed": false, "internalType": "string", "name": "investigator", "type": "string"}], "name": "EvidenceStored", "type": "event"}, {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "evidenceArray", "outputs": [{"internalType": "bytes32", "name": "evidenceHash", "type": "bytes32"}, {"internalType": "string", "name": "timestamp", "type": "string"}, {"internalType": "string", "name": "investigator", "type": "string"}, {"internalType": "string", "name": "content", "type": "string"}, {"internalType": "string", "name": "authorUsername", "type": "string"}, {"internalType": "string", "name": "platform", "type": "string"}, {"internalType": "string", "name": "category", "type": "string"}, {"internalType": "string", "name": "engagementMetrics", "type": "string"}, {"internalType": "uint256", "name": "confidence", "type": "uint256"}, {"internalType": "string", "name": "justification", "type": "string"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "evidenceCount", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "_index", "type": "uint256"}], "name": "getEvidence", "outputs": [{"internalType": "bytes32", "name": "evidenceHash", "type": "bytes32"}, {"internalType": "string", "name": "timestamp", "type": "string"}, {"internalType": "string", "name": "investigator", "type": "string"}, {"internalType": "string", "name": "content", "type": "string"}, {"internalType": "string", "name": "authorUsername", "type": "string"}, {"internalType": "string", "name": "platform", "type": "string"}, {"internalType": "string", "name": "category", "type": "string"}, {"internalType": "string", "name": "engagementMetrics", "type": "string"}, {"internalType": "string[]", "name": "mediaUrls", "type": "string[]"}, {"internalType": "uint256", "name": "confidence", "type": "uint256"}, {"internalType": "string", "name": "justification", "type": "string"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "txHash", "type": "bytes32"}], "name": "getEvidenceByTxHash", "outputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}, {"internalType": "bytes32", "name": "evidenceHash", "type": "bytes32"}, {"internalType": "string", "name": "timestamp", "type": "string"}, {"internalType": "string", "name": "investigator", "type": "string"}, {"internalType": "string", "name": "content", "type": "string"}, {"internalType": "string", "name": "authorUsername", "type": "string"}, {"internalType": "string", "name": "platform", "type": "string"}, {"internalType": "string", "name": "category", "type": "string"}, {"internalType": "string", "name": "engagementMetrics", "type": "string"}, {"internalType": "string[]", "name": "mediaUrls", "type": "string[]"}, {"internalType": "uint256", "name": "confidence", "type": "uint256"}, {"internalType": "string", "name": "justification", "type": "string"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "_evidenceHash", "type": "bytes32"}, {"internalType": "string", "name": "_timestamp", "type": "string"}, {"internalType": "string", "name": "_investigator", "type": "string"}, {"internalType": "string", "name": "_content", "type": "string"}, {"internalType": "string", "name": "_authorUsername", "type": "string"}, {"internalType": "string", "name": "_platform", "type": "string"}, {"internalType": "string", "name": "_category", "type": "string"}, {"internalType": "string", "name": "_engagementMetrics", "type": "string"}, {"internalType": "string[]", "name": "_mediaUrls", "type": "string[]"}, {"internalType": "uint256", "name": "_confidence", "type": "uint256"}, {"internalType": "string", "name": "_justification", "type": "string"}], "name": "storeEvidence", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}], "name": "txHashToEvidenceId", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}]''')

contract_abi = _load_abi()

# ── Global state (lazy-initialized) ──
blockchain_available = False
web3 = None
contract = None
account = None


def init_blockchain():
    """Initialize Web3 connection, contract, and account. Returns True on success."""
    global web3, contract, account, blockchain_available
    if blockchain_available and web3 and contract and account:
        return True

    try:
        if not all([infura_project_id, private_key, contract_address, wallet_address]):
            logger.error("Blockchain initialization failed: Missing environment variables")
            return False

        infura_url_final = infura_project_id if infura_project_id.startswith("http") else f"https://sepolia.infura.io/v3/{infura_project_id}"
        web3 = Web3(Web3.HTTPProvider(infura_url_final, session=session, request_kwargs={'timeout': 10}))

        if not web3.is_connected():
            logger.error("Failed to connect to Sepolia")
            return False

        logger.info(f"Connected to Sepolia. Chain ID: {web3.eth.chain_id}")

        if not web3.is_address(contract_address):
            logger.error(f"Invalid contract address: {contract_address}")
            return False

        contract = web3.eth.contract(
            address=web3.to_checksum_address(contract_address),
            abi=contract_abi
        )
        account = web3.eth.account.from_key(private_key)

        if account.address.lower() != wallet_address.lower():
            logger.error("Private key does not match WALLET_ADDRESS")
            return False

        web3.eth.default_account = account.address
        blockchain_available = True
        logger.info(f"Blockchain service is ACTIVE. Account: {account.address}")
        return True

    except Exception as e:
        logger.error(f"Blockchain initialization failed: {e}")
        return False


def generate_evidence_hash(content, author_username, post_id, timestamp):
    """Generate SHA-256 hash of evidence fields."""
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
    """Store evidence data on the blockchain."""
    if not init_blockchain():
        return {"error": "Blockchain service unavailable"}

    try:
        # Extract fields
        content = evidence_data.get("text", "")
        author = evidence_data.get("author_username", "")
        platform = evidence_data.get("platform", "Twitter/X")
        timestamp = evidence_data.get("created_at", datetime.utcnow().isoformat())
        
        # Original defamation metadata
        defamation = evidence_data.get("defamation", {})
        category = defamation.get("category", "Safe")
        confidence_score = defamation.get("confidence", 0.0)
        justification = defamation.get("justification", "No justification provided.") # Added justification
        
        # Engagement context
        engagement = evidence_data.get("engagement", {})
        engagement_json = json.dumps(engagement)
        
        # Scaling confidence (0.94 -> 9400)
        scaled_confidence = int(confidence_score * 10000)
        
        # Media URLs (list of strings)
        media_urls = evidence_data.get("media_urls", []) if isinstance(evidence_data.get("media_urls"), list) else []
        
        # Generate evidence hash (keccak256) - ALWAYS use original full text for forensic proof
        post_id = evidence_data.get("post_id", "0")
        raw_hash = generate_evidence_hash(content, author, post_id, timestamp)
        evidence_hash_bytes = bytes.fromhex(raw_hash)
        
        # Truncate strings for on-chain storage to save gas (Originals stay in local DB)
        # 1000 characters is plenty for a preview on Etherscan/Dashboard
        content_preview = (content[:997] + "...") if len(content) > 1000 else content
        justification_preview = (justification[:997] + "...") if len(justification) > 1000 else justification

        logger.info(f"Preparing blockchain transaction for Hash: {raw_hash} (Content length: {len(content)})")
        
        # Build transaction
        tx_fn = contract.functions.storeEvidence(
            evidence_hash_bytes,
            timestamp,
            str(evidence_data.get("investigator", "2")), 
            content_preview, # Use optimized preview
            author,
            platform,
            category,
            engagement_json,
            media_urls,
            scaled_confidence,
            justification_preview # Use optimized preview
        )

        nonce = web3.eth.get_transaction_count(account.address)
        
        # Dynamic Gas Estimation
        try:
            gas_estimate = tx_fn.estimate_gas({"from": account.address})
            # Add 25% safety buffer to prevent "Out of Gas" on mined blocks
            final_gas = int(gas_estimate * 1.25)
            logger.info(f"Estimated Gas: {gas_estimate}, Cap set to: {final_gas}")
        except Exception as ge:
            logger.warning(f"Gas estimation failed, falling back to safety limit: {ge}")
            final_gas = 3000000 # Higher safety fallback

        tx = tx_fn.build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": final_gas, 
            "gasPrice": web3.eth.gas_price,
            "chainId": 11155111
        })

        private_key = os.getenv("PRIVATE_KEY")
        if not private_key:
            return {"error": "Private key missing"}

        signed_tx = web3.eth.account.sign_transaction(tx, private_key)
        eth_tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        eth_tx_hash_hex = f"0x{eth_tx_hash.hex()}" if not eth_tx_hash.hex().startswith("0x") else eth_tx_hash.hex()
        logger.info(f"Transaction sent: {eth_tx_hash_hex}")

        receipt = web3.eth.wait_for_transaction_receipt(eth_tx_hash, timeout=300)
        logger.info(f"Transaction mined. Status: {receipt.status}, Gas used: {receipt.gasUsed}")

        if receipt.status == 0:
            return {"receipt": receipt, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": eth_tx_hash_hex, "error": "Transaction reverted (status=0)"}

        # Parse EvidenceStored event
        evidence_id = -1
        event_tx_hash = None

        try:
            events = contract.events.EvidenceStored().process_receipt(receipt)
            if events:
                evidence_id = events[0]["args"]["index"]
                raw_hash = events[0]["args"]["txHash"].hex()
                event_tx_hash = f"0x{raw_hash}" if not raw_hash.startswith("0x") else raw_hash
                logger.info(f"Event parsed: evidence_id={evidence_id}, txHash={event_tx_hash}")
        except Exception as e:
            logger.warning(f"Event parsing failed: {e}")

        if evidence_id == -1:
            try:
                evidence_id = contract.functions.evidenceCount().call() - 1
            except Exception:
                evidence_id = 0
            raw_hash = receipt.transactionHash.hex()
            event_tx_hash = f"0x{raw_hash}" if not raw_hash.startswith("0x") else raw_hash
            logger.warning(f"Using evidenceCount fallback: evidence_id={evidence_id}")

        return {
            "receipt": receipt,
            "evidence_id": evidence_id,
            "tx_hash": event_tx_hash or eth_tx_hash_hex,
            "eth_tx_hash": eth_tx_hash_hex
        }

    except Exception as e:
        logger.error(f"store_evidence error: {str(e)}")
        return {"receipt": None, "evidence_id": -1, "tx_hash": None, "eth_tx_hash": None, "error": str(e)}


def get_evidence(index):
    """Retrieve evidence from blockchain by index."""
    if not init_blockchain():
        return None
    try:
        res = contract.functions.getEvidence(index).call()
        if res and res[0]:
            return {
                "hash": f"0x{res[0].hex()}" if isinstance(res[0], bytes) else res[0],
                "timestamp": res[1],
                "investigator": res[2],
                "content": res[3],
                "author_username": res[4],
                "platform": res[5],
                "category": res[6],
                "engagement": json.loads(res[7]) if res[7] else {},
                "mediaUrls": res[8],
                "confidence": res[9] / 10000.0,
                "justification": res[10] if len(res) > 10 else ""
            }
        return None
    except Exception as e:
        logger.error(f"get_evidence error: {str(e)}")
        return None


def get_evidence_by_tx_hash(tx_hash):
    """Retrieve evidence from blockchain by transaction hash."""
    if not init_blockchain():
        return None
    try:
        if not tx_hash or not tx_hash.startswith('0x') or len(tx_hash) != 66:
            return None
        tx_hash_bytes = bytes.fromhex(tx_hash[2:])
        res = contract.functions.getEvidenceByTxHash(tx_hash_bytes).call()
        if res and res[1]:
            return {
                "evidence_id": res[0],
                "hash": f"0x{res[1].hex()}" if isinstance(res[1], bytes) else res[1],
                "timestamp": res[2],
                "investigator": res[3],
                "content": res[4],
                "author_username": res[5],
                "platform": res[6],
                "category": res[7],
                "engagement": json.loads(res[8]) if res[8] else {},
                "mediaUrls": res[9],
                "confidence": res[10] / 10000.0,
                "justification": res[11] if len(res) > 11 else ""
            }
        return None
    except Exception as e:
        logger.error(f"get_evidence_by_tx_hash error: {str(e)}")
        return None
