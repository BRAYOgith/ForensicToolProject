import sqlite3

def find_hash(target_hash):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    
    print(f"Searching for: {target_hash}")
    
    # Get column names
    c.execute("PRAGMA table_info(stored_evidence)")
    cols = [col[1] for col in c.fetchall()]
    print(f"Columns: {cols}")
    
    # Search in stored_evidence
    c.execute("SELECT * FROM stored_evidence WHERE tx_hash = ? OR eth_tx_hash = ?", (target_hash, target_hash))
    res = c.fetchall()
    if res:
        for row in res:
            print("--- Found in stored_evidence ---")
            for name, val in zip(cols, row):
                print(f"{name}: {val}")
    else:
        print("Not found in stored_evidence")
        
    conn.close()

if __name__ == "__main__":
    find_hash("0x15c3c6ed51ed6081bde2f1106cb371f4c3c2cacab396f3bd25112036e72dcc80")
