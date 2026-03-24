"""
Database Backup Script for Forensic Tool
Copies forensic.db to a timestamped backup in backups/ directory.
Retains the last 30 daily backups and auto-cleans older ones.

Usage:
    python backup_db.py

Schedule with cron (Linux) or Task Scheduler (Windows) for daily backups.
"""
import shutil
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'forensic.db')
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
MAX_BACKUPS = 30


def backup():
    """Create a timestamped backup of forensic.db."""
    if not os.path.exists(DB_PATH):
        logger.error(f"Database not found: {DB_PATH}")
        return False

    os.makedirs(BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"forensic_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    try:
        shutil.copy2(DB_PATH, backup_path)
        backup_size = os.path.getsize(backup_path)
        original_size = os.path.getsize(DB_PATH)

        if backup_size != original_size:
            logger.error(f"Backup size mismatch: original={original_size}, backup={backup_size}")
            os.remove(backup_path)
            return False

        logger.info(f"Backup created: {backup_filename} ({backup_size} bytes)")
        cleanup_old_backups()
        return True

    except Exception as e:
        logger.error(f"Backup failed: {e}")
        return False


def cleanup_old_backups():
    """Remove oldest backups when count exceeds MAX_BACKUPS."""
    try:
        backups = sorted([
            f for f in os.listdir(BACKUP_DIR)
            if f.startswith('forensic_backup_') and f.endswith('.db')
        ])

        while len(backups) > MAX_BACKUPS:
            oldest = backups.pop(0)
            os.remove(os.path.join(BACKUP_DIR, oldest))
            logger.info(f"Cleaned up old backup: {oldest}")

    except Exception as e:
        logger.error(f"Cleanup failed: {e}")


if __name__ == '__main__':
    success = backup()
    if success:
        print("Backup completed successfully.")
    else:
        print("Backup failed. Check logs for details.")
