import store_blockchain
import logging

logging.basicConfig(level=logging.INFO)

def final_contract_check():
    if not store_blockchain.init_blockchain():
        print("Blockchain init failed")
        return
    
    web3 = store_blockchain.web3
    addr = store_blockchain.contract_address
    print(f"Checking contract at: {addr}")
    
    try:
        # Try a direct call to evidenceCount
        count = store_blockchain.contract.functions.evidenceCount().call()
        print(f"SUCCESS: Success! Evidence Count: {count}")
    except Exception as e:
        print(f"ERROR: Contract call failed: {e}")
        
    # Check if there's any other record in DB with a different hash
    import sqlite3
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT tx_hash FROM stored_evidence WHERE id=1')
    r = c.fetchone()
    if r:
        print(f"Mapping test: 0x15c3... -> {r[0]}")
    conn.close()

if __name__ == "__main__":
    final_contract_check()
