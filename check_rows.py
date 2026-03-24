import sqlite3

def check_db():
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    
    print("Checking Row ID 1:")
    c.execute('SELECT * FROM stored_evidence WHERE id=1')
    r = c.fetchone()
    print(r)
    
    target_eth_hash = '0x15c3c6ed51ed6081bde2f1106cb371f4c3c2cacab396f3bd25112036e72dcc80'
    print(f"\nChecking all matches for eth_tx_hash = {target_eth_hash}:")
    c.execute('SELECT * FROM stored_evidence WHERE eth_tx_hash=?', (target_eth_hash,))
    rs = c.fetchall()
    print(f"Total matches: {len(rs)}")
    for row in rs:
        print(row)
        
    conn.close()

if __name__ == "__main__":
    check_db()
