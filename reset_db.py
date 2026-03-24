import sqlite3
import os

def reset_database():
    db_path = 'forensic.db'
    if os.path.exists(db_path):
        print(f"Connecting to {db_path}...")
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # List of tables to clear
        tables = [
            'fetched_evidence',
            'stored_evidence',
            'audit_logs',
            'requests_log',
            'users' # Included because user said "delete everything" to "start fresh"
        ]
        
        for table in tables:
            try:
                print(f"Clearing table: {table}")
                c.execute(f"DELETE FROM {table}")
                # Reset autoincrement
                c.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}'")
            except Exception as e:
                print(f"Error clearing table {table}: {e}")
        
        conn.commit()
        conn.close()
        print("Database reset successfully.")
    else:
        print(f"Database {db_path} not found.")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete EVERYTHING in the database? (y/n): ")
    if confirm.lower() == 'y':
        reset_database()
    else:
        print("Reset cancelled.")
