import store_blockchain
import sqlite3
import os
import time
from dotenv import load_dotenv

def test_cycle():
    load_dotenv()
    print("Step 1: Initializing Blockchain...")
    if not store_blockchain.init_blockchain():
        print("Blockchain init failed")
        return

    # Mock evidence data
    evidence_data = {
        "hash": "test_hash_789",
        "timestamp": "2026-03-24T18:00:00",
        "investigator": "0x25Dfafc7dB916387EA0627820169D9335538bB4c",
        "content": "Test evidence content for final verification",
        "author_username": "tester",
        "platform": "test_platform",
        "category": "Test",
        "engagement_metrics": '{"likes": 10}',
        "media_urls": ["http://example.com/image.jpg"],
        "confidence": 95
    }

    print("\nStep 2: Storing Evidence on Blockchain...")
    result = store_blockchain.store_evidence(evidence_data)

    if result.get("evidence_id") == -1:
        print(f"Failed to store evidence: {result.get('error')}")
        return

    eth_tx_hash = result["eth_tx_hash"]
    contract_tx_hash = result["tx_hash"]
    evidence_id_str = str(result["evidence_id"])
    print(f"Successfully stored! ID: {evidence_id_str}")
    print(f"Ethereum TX Hash: {eth_tx_hash}")
    print(f"Contract Hash: {contract_tx_hash}")

    # Step 3: Insert into local database
    print("\nStep 3: Updating local database...")
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    post_id = "1002"
    user_id = 2
    # Table: id, user_id, evidence_id, tx_hash, eth_tx_hash, timestamp, post_id
    c.execute('''
        INSERT INTO stored_evidence (user_id, evidence_id, tx_hash, eth_tx_hash, timestamp, post_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, evidence_id_str, contract_tx_hash, eth_tx_hash, str(int(time.time())), post_id))
    conn.commit()
    conn.close()
    print("Database updated.")

    # Step 4: Test retrieval via the NEW mapping logic
    print("\nStep 4: Testing retrieval mapping (Simulating api.py)...")
    
    lookup_hash = eth_tx_hash
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT tx_hash FROM stored_evidence WHERE eth_tx_hash = ? LIMIT 1', (eth_tx_hash,))
    row = c.fetchone()
    if row and row[0]:
        lookup_hash = row[0]
        print(f"Found mapping: {eth_tx_hash} -> {lookup_hash}")
    conn.close()

    if lookup_hash == contract_tx_hash:
        print("SUCCESS: Mapping verified!")
    else:
        print("ERROR: Mapping failed!")

    print("\nStep 5: Retrieving from Blockchain with mapped hash...")
    retrieved = store_blockchain.get_evidence_by_tx_hash(lookup_hash)
    if retrieved:
        print("SUCCESS: Evidence retrieved from blockchain successfully!")
        print(f"Retrieved Content: {retrieved['content'][:50]}...")
    else:
        print("ERROR: Failed to retrieve evidence from blockchain.")

if __name__ == "__main__":
    test_cycle()
