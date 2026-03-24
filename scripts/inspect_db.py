import sqlite3
import pandas as pd
import os

db_path = 'forensic.db'

if not os.path.exists(db_path):
    print(f"ERROR: Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    
    print(" --- TABLES IN DATABASE ---")
    tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table';", conn)
    print(tables)
    
    for table in tables['name']:
        print(f"\n --- CONTENT OF TABLE: {table} (Top 5) ---")
        try:
            df = pd.read_sql_query(f"SELECT * FROM {table} LIMIT 5;", conn)
            print(df.to_string(index=False))
        except Exception as e:
            print(f"Error reading {table}: {e}")
            
    conn.close()
