import logging
from functools import wraps
import os
import json
import re
import sqlite3
import jwt
from datetime import datetime, timedelta, timezone
import requests
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from bcrypt import hashpw, checkpw, gensalt
import pdfkit
import io
import base64

def generate_pdf(html_content, options=None):
    try:
        return pdfkit.from_string(html_content, False, options=options or {})
    except OSError as e:
        if 'wkhtmltopdf' in str(e).lower():
            raise Exception("PDF generation unavailable: wkhtmltopdf not installed on server.")
        raise
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise

# Initialize Logging first
logging.basicConfig(level=logging.INFO, filename='forensic.log', format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

from store_blockchain import (
    store_evidence, get_evidence, get_evidence_by_tx_hash, generate_evidence_hash
)

import hashlib
import time
from crypto_utils import encrypt_field, decrypt_field

# Heavy dependencies - wrapped for clean production startup
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    import emoji
    HAS_LOCAL_AI = True
except ImportError:
    tokenizer = None
    model = None
    torch = None
    emoji = None
    HAS_LOCAL_AI = False

try:
    import easyocr
    # Initialize reader once at startup with English and Swahili support
    # Note: This may take several minutes on first run to download models
    logger.info("Initializing EasyOCR reader (en, sw) on CPU...")
    ocr_reader = easyocr.Reader(['en', 'sw'], gpu=False) 
    logger.info("EasyOCR initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize EasyOCR: {e}")
    ocr_reader = None

device = None
if HAS_LOCAL_AI:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        MODEL_PATH = "models/afro_xlmr_forensics"
        if os.path.exists(MODEL_PATH):
            tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
            model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH).to(device)
            model.eval()
            logger.info("Forensic model loaded successfully")
        else:
            logger.warning(f"Model path {MODEL_PATH} not found. Local inference disabled.")
            model = None
    except Exception as e:
        logger.error(f"Local model loading failed: {e}")
        model = None

app = Flask(__name__)

allowed_origins = [
    "https://forensic-tool-project.vercel.app",
    "https://forensictoolproject.onrender.com"
]
# In development, allow both localhost and 127.0.0.1 on common ports
if os.getenv("FLASK_ENV") == "development" or not os.getenv("FLASK_ENV"):
    allowed_origins.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    ])
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

@app.after_request
def set_security_headers(response):
    csp = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self' https://forensictoolproject.onrender.com https://sepolia.etherscan.io"
    )
    
    # Allow local API connections in dev mode
    if os.getenv("FLASK_ENV") == "development" or not os.getenv("FLASK_ENV"):
        csp += " http://localhost:5000 http://127.0.0.1:5000"
        
    csp += "; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    response.headers['Content-Security-Policy'] = csp
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    return response


app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# Session security settings
SESSION_TIMEOUT_HOURS = int(os.getenv('SESSION_TIMEOUT_HOURS', 24))
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
PASSWORD_HISTORY_SIZE = 5
FORCE_PASSWORD_CHANGE_DAYS = 90

# Simple CAPTCHA generator
CAPTCHA_CODE = {}
def generate_captcha():
    import random
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    op = random.choice(['+', '-', '*'])
    if op == '+':
        answer = num1 + num2
    elif op == '-':
        answer = num1 - num2
    else:
        answer = num1 * num2
    code = f"{num1} {op} {num2}"
    captcha_id = os.urandom(8).hex()
    CAPTCHA_CODE[captcha_id] = answer
    return captcha_id, code

def verify_captcha(captcha_id, user_answer):
    if captcha_id not in CAPTCHA_CODE:
        return False
    try:
        correct = str(CAPTCHA_CODE[captcha_id]) == str(user_answer)
        if correct:
            del CAPTCHA_CODE[captcha_id]
        return correct
    except:
        return False

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Forensic Lexicons for Personalization
NCIC_LEXICON = [
    "Hatupangwingwi", "Mende", "Chunga Kura", "Kama noma noma", 
    "Kwekwe", "Madoa doa", "Operation Linda Kura", "Watu wa kurusha mawe", 
    "Watajua hawajui", "Wabara waende kwao", "Wakuja", "Fumigation"
]

DEFAMATORY_MARKERS = [
    "thief", "corrupt", "cartel", "mafia", "scammer", "conman", "mwizi", 
    "fake", "fraud", "liar", "muongo", "character assassination", "poison",
    "jinxed", "betrayed", "failed", "stole", "corrupt"
]

SECURITY_THREATS = [
    "kill", "planning", "bomb", "attack", "al-shabaab", "terror", "violence",
    "mapinduzi", "revolution", "overthrow", "dead"
]

SAFE_SIGNIFIERS = [
    "think", "opinion", "debate", "agree", "disagree", "policy", "news",
    "discussion", "report", "fact", "together", "peace"
]

def extract_forensic_markers(text):
    text_lower = text.lower()
    found_ncic = [word for word in NCIC_LEXICON if word.lower() in text_lower]
    found_defam = [word for word in DEFAMATORY_MARKERS if word.lower() in text_lower]
    found_security = [word for word in SECURITY_THREATS if word.lower() in text_lower]
    found_safe = [word for word in SAFE_SIGNIFIERS if word.lower() in text_lower]
    
    # Capture handles
    found_entities = re.findall(r'@\w+', text)
    
    # Capture potential Proper Names (Sequences of Title Case words)
    # Improved regex to handle acronyms and single initials
    names = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
    unique_names = list(set(names))
    
    # Capture Hashtags
    hashtags = re.findall(r'#\w+', text)
    
    # Clean up markers by removing empty results
    return {
        "ncic": list(set(found_ncic)),
        "defamatory": list(set(found_defam)),
        "security": list(set(found_security)),
        "safe": list(set(found_safe)),
        "entities": list(set(found_entities)),
        "names": unique_names,
        "hashtags": hashtags
    }

def clean_for_ai(text):
    # Convert real emojis to text (Matches training pipeline)
    if emoji:
        text = emoji.demojize(text)
    # Standardize handles
    text = re.sub(r'@\w+', '@user', text)
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    return text.strip()

def process_visual_content(media_urls):
    if not media_urls:
        return {"text": "", "found": False, "status": "no_media"}
        
    if ocr_reader is None:
        logger.warning("OCR process requested but reader is not initialized")
        return {"text": "", "found": False, "status": "service_unavailable"}
    
    extracted_text = []
    found_any_text = False
    
    for url in media_urls:
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                results = ocr_reader.readtext(resp.content)
                text = " ".join([res[1] for res in results])
                if text.strip():
                    extracted_text.append(text.strip())
                    found_any_text = True
        except Exception as e:
            logger.error(f"OCR failed for {url}: {e}")
            
    return {
        "text": " | ".join(extracted_text) if extracted_text else "",
        "found": found_any_text,
        "status": "extracted" if found_any_text else "no_text_detected"
    }


def predict_defamatory(text):
    # Determine if we should use HF API (Always in Prod if local libs missing or explicitly requested)
    is_prod = os.getenv("FLASK_ENV") == "production"
    use_hf = is_prod or not HAS_LOCAL_AI or os.getenv("USE_HF_API") == "true" or model is None

    confidences = [0.0, 0.0, 0.0]
    if use_hf:
        logger.info("Running inference via Hugging Face API...")
        try:
            API_URL = "https://api-inference.huggingface.co/models/BrianNj/afro-xlmr-forensics"
            # Try specific token, then generic token, then none
            hf_token = os.getenv('HF_TOKEN') or os.getenv('HUGGINGFACE_TOKEN')
            headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
            
            payload = {"inputs": text, "options": {"wait_for_model": True}}
            response = requests.post(API_URL, headers=headers, json=payload, timeout=20)
            
            if response.status_code == 200:
                output = response.json()
                # Afro-XLMR typically returns a list of label/score dicts
                # Label mapping: LABEL_0=Safe, LABEL_1=Defamatory, LABEL_2=Hate Speech
                inner = output[0] if isinstance(output, list) and isinstance(output[0], list) else output
                if isinstance(inner, list):
                    for item in inner:
                        label_idx = int(item['label'].split('_')[-1])
                        if label_idx < 3:
                            confidences[label_idx] = item['score']
                else:
                    logger.error(f"Unexpected HF API output format: {output}")
                    return {"is_defamatory": False, "category": "Error", "confidence": 0.0, "justification": "Unexpected analysis result format."}
            else:
                logger.error(f"HF API Error ({response.status_code}): {response.text}")
                return {"is_defamatory": False, "category": "Error", "confidence": 0.0, "justification": "Inference API currently unavailable."}
        except Exception as e:
            logger.error(f"HF API Failed: {e}")
            return {"is_defamatory": False, "category": "Error", "confidence": 0.0, "justification": "Network error during analysis."}
    else:
        # Local Inference
        try:
            cleaned_text = clean_for_ai(text)
            inputs = tokenizer(cleaned_text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
            with torch.no_grad():
                outputs = model(**inputs)
                prob = torch.nn.functional.softmax(outputs.logits, dim=-1)
                confidences = prob[0].tolist()
        except Exception as e:
            logger.error(f"Local Inference Failed: {e}")
            return {"is_defamatory": False, "category": "Error", "confidence": 0.0, "justification": "Local model execution failed."}

    # Common Logic for Verdict and Justification
    categories = ["Safe", "Defamatory", "Hate Speech"]
    HATE_THRESHOLD = 0.45
    DEFAM_THRESHOLD = 0.25
    
    if confidences[2] > HATE_THRESHOLD:
        top_class = 2
    elif confidences[1] > DEFAM_THRESHOLD:
        top_class = 1
    else:
        top_class = 0
        
    result_category = categories[top_class]
    flag = top_class > 0
    markers = extract_forensic_markers(text)
    
    def generate_granular_justification(cat, score):
        cat_lower = cat.lower().replace(" ", "_")
        subjects = f" targeting {', '.join(markers['entities'] + markers['names'])}" if (markers['entities'] or markers['names']) else ""
        
        if cat_lower == "hate_speech":
            if score > 0.40:
                specifics = f" Critical markers: {', '.join(markers['ncic'] + markers['security'])}." if (markers['ncic'] or markers['security']) else ""
                return f"High probability of incitement or prohibited speech patterns.{specifics}{subjects}"
            return "Low-level discourse markers, below legal threshold."
        elif cat_lower == "defamatory":
            if score > 0.35:
                specifics = f" Markers: {', '.join(markers['defamatory'])}." if markers['defamatory'] else ""
                return f"High probability of reputational harm.{specifics}{subjects}"
            return "Suggestive sentiment, lacks definitive defamatory markers."
        if cat_lower == "safe":
            specifics = f" Found neutral markers: {', '.join(markers['safe'])}." if markers['safe'] else ""
            mentions = f" Discussing {', '.join(markers['hashtags'] + markers['entities'] + markers['names'])}." if (markers['entities'] or markers['names'] or markers['hashtags']) else ""
            return f"Standard social discourse or objective reporting.{specifics}{mentions}".strip()

    all_justifications = {
        "safe": generate_granular_justification("Safe", confidences[0]),
        "defamatory": generate_granular_justification("Defamatory", confidences[1]),
        "hate_speech": generate_granular_justification("Hate Speech", confidences[2])
    }

    return {
        "is_defamatory": flag,
        "category": result_category,
        "confidence": confidences[top_class],
        "justification": all_justifications[result_category.lower().replace(" ", "_")],
        "all_scores": {"safe": confidences[0], "defamatory": confidences[1], "hate_speech": confidences[2]},
        "all_justifications": all_justifications,
        "technical_justification": f"{'HF-Cloud' if use_hf else 'Local-AfroXLMR'} analyzed {len(text)} chars. Markers: {sum(len(v) for v in markers.values())}."
    }

bearer_token = os.getenv("X_BEARER_TOKEN")
if not bearer_token:
    logger.error("Missing X_BEARER_TOKEN in environment variables")
    raise Exception("Missing X_BEARER_TOKEN")

headers = {"Authorization": f"Bearer {bearer_token}"}

BREVO_API_KEY = os.getenv("BREVO_API_KEY")

def send_forensic_email(email, token, email_type="activation"):
    frontend_url = os.getenv("FRONTEND_URL", "https://forensic-tool-project.vercel.app")
    endpoint = 'activate' if email_type == 'activation' else 'reset-password'
    link = f"{frontend_url}/{endpoint}?token={token}"

    if not BREVO_API_KEY:
        logger.warning(f"BREVO_API_KEY not set -- printing {email_type} link to console for local testing")
        print(f"\n=== {email_type.upper()} LINK FOR {email} ===\n{link}\n========================================\n")
        return
    
    subject = "Activate Your ChainForensix Account" if email_type == "activation" else "Reset Your ChainForensix Password"
    title = "Account Activation" if email_type == "activation" else "Password Reset"
    button_text = "Activate My Account" if email_type == "activation" else "Reset My Password"
    footer_text = "If you didn't request this, please ignore this email."

    url = "https://api.brevo.com/v3/smtp/email"
    payload = {
        "sender": {"name": "ChainForensix Support", "email": "briannjoki619@gmail.com"},
        "to": [{"email": email}],
        "subject": subject,
        "htmlContent": f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
            <div style="background: white; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center;">
                <h1 style="color: #06b6d4; font-size: 24px; font-weight: 800; tracking-tighter: -0.05em;">ChainForensix</h1>
                <h2 style="color: #0f172a; margin: 30px 0;">{title}</h2>
                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                    Please click the button below to proceed with your {email_type}.
                </p>
                <a href="{link}" 
                   style="display: inline-block; margin: 30px 0; padding: 16px 32px; background: #06b6d4; color: white; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 8px;">
                    {button_text}
                </a>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">
                    This link expires in 1 hour.<br>
                    {footer_text}
                </p>
            </div>
        </body>
        </html>
        """
    }

    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            logger.info(f"{email_type} email successfully sent to {email}")
        else:
            logger.error(f"Brevo error {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Failed to send {email_type} email: {e}")

def init_db():
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        is_active INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        account_status TEXT DEFAULT 'active',
        failed_attempts INTEGER DEFAULT 0,
        lockout_until TEXT,
        password_history TEXT,
        last_password_change TEXT,
        last_login TEXT,
        last_login_ip TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Migrate old databases - add missing columns
    columns = [row[1] for row in c.execute('PRAGMA table_info(users)').fetchall()]
    if 'is_admin' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0')
    if 'account_status' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT "active"')
    if 'failed_attempts' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0')
    if 'lockout_until' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN lockout_until TEXT')
    if 'password_history' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN password_history TEXT')
    if 'last_password_change' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN last_password_change TEXT')
    if 'last_login' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN last_login TEXT')
    if 'last_login_ip' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN last_login_ip TEXT')
    c.execute('''CREATE TABLE IF NOT EXISTS fetched_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        post_id TEXT,
        content TEXT,
        author_username TEXT,
        created_at TEXT,
        media_urls TEXT,
        timestamp TEXT,
        verified INTEGER,
        is_defamatory INTEGER DEFAULT 0,
        category TEXT,
        confidence REAL,
        engagement TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        details TEXT,
        ip_address TEXT,
        timestamp TEXT,
        prev_hash TEXT,
        entry_hash TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS stored_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        evidence_id TEXT,
        tx_hash TEXT,
        eth_tx_hash TEXT,
        timestamp TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS requests_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        request_type TEXT,
        timestamp TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        page_context TEXT,
        escalated INTEGER DEFAULT 0,
        timestamp TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS expert_appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        topic TEXT,
        preferred_date TEXT,
        preferred_time TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT
    )''')
    c.execute('PRAGMA table_info(users)')
    columns = [row[1] for row in c.fetchall()]
    if 'is_active' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 0')
    if 'email' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN email TEXT')
    columns = [row[1] for row in c.execute('PRAGMA table_info(fetched_evidence)').fetchall()]
    if 'verified' not in columns:
        c.execute('ALTER TABLE fetched_evidence ADD COLUMN verified INTEGER')
    if 'is_defamatory' not in columns:
        c.execute('ALTER TABLE fetched_evidence ADD COLUMN is_defamatory INTEGER DEFAULT 0')
    if 'category' not in columns:
        c.execute('ALTER TABLE fetched_evidence ADD COLUMN category TEXT')
    if 'confidence' not in columns:
        c.execute('ALTER TABLE fetched_evidence ADD COLUMN confidence REAL')
    if 'engagement' not in columns:
        c.execute('ALTER TABLE fetched_evidence ADD COLUMN engagement TEXT')

    columns = [row[1] for row in c.execute('PRAGMA table_info(stored_evidence)').fetchall()]
    if 'eth_tx_hash' not in columns:
        c.execute('ALTER TABLE stored_evidence ADD COLUMN eth_tx_hash TEXT')
    if 'post_id' not in columns:
        c.execute('ALTER TABLE stored_evidence ADD COLUMN post_id TEXT')
    
    # Backfill is_defamatory for old records
    c.execute('UPDATE fetched_evidence SET is_defamatory = 0 WHERE is_defamatory IS NULL')
    
    # Check if audit_logs exists (created above, but just in case of partial runs)
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'")
    if not c.fetchone():
        c.execute('''CREATE TABLE audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            details TEXT,
            ip_address TEXT,
            timestamp TEXT,
            prev_hash TEXT,
            entry_hash TEXT
        )''')
    
    # Add security columns to users table if missing
    try:
        columns = [row[1] for row in c.execute('PRAGMA table_info(users)').fetchall()]
        if 'failed_attempts' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0')
        if 'lockout_until' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN lockout_until TEXT')
        if 'password_history' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN password_history TEXT')
        if 'last_password_change' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN last_password_change TEXT')
        if 'last_login' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN last_login TEXT')
        if 'last_login_ip' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN last_login_ip TEXT')
        conn.commit()
    except Exception as e:
        logger.warning(f"Could not add security columns: {e}")
    
    conn.commit()
    conn.close()

# Ensure database is initialized and migrated on startup, even when run via Gunicorn
init_db()

def log_audit(user_id, action, details):
    """
    Log a user action with tamper-evident hash chaining.
    """
    try:
        timestamp = datetime.now().isoformat()
        ip_address = request.remote_addr if request else "unknown"
        
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        
        # Get the hash of the last entry to chain
        c.execute('SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1')
        row = c.fetchone()
        prev_hash = row[0] if row else "GENESIS_BLOCK"
        
        # Create hash of this entry
        entry_data = f"{prev_hash}{user_id}{action}{details}{timestamp}{ip_address}"
        entry_hash = hashlib.sha256(entry_data.encode('utf-8')).hexdigest()
        
        c.execute(
            'INSERT INTO audit_logs (user_id, action, details, ip_address, timestamp, prev_hash, entry_hash) '
            'VALUES (?, ?, ?, ?, ?, ?, ?)',
            (user_id, action, details, ip_address, timestamp, prev_hash, entry_hash)
        )
        conn.commit()
        conn.close()
        logger.info(f"Audit Log: User {user_id} - {action} - {details}")
    except Exception as e:
        logger.error(f"Audit Logging Failed: {e}")

init_db()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Priority 1: httpOnly cookie (most secure)
        if 'token' in request.cookies:
            token = request.cookies.get('token')
        # Priority 2: Authorization header (backward compatibility)
        elif request.headers.get('Authorization', '').startswith('Bearer '):
            token = request.headers.get('Authorization').split(' ')[1]

        if not token:
            return jsonify({'error': 'Token is missing or invalid'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['user_id']
            conn = sqlite3.connect('forensic.db')
            c = conn.cursor()
            c.execute('SELECT is_active FROM users WHERE id = ?', (current_user,))
            result = c.fetchone()
            conn.close()
            if not result or result[0] == 0:
                return jsonify({'error': 'Account not activated. Please check your email for activation link.'}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def expand_urls(text, urls):
    if not urls:
        return text
    for url_obj in urls:
        if 'url' in url_obj and 'expanded_url' in url_obj:
            text = text.replace(url_obj['url'], url_obj['expanded_url'])
    return text

def validate_auth_input(username=None, password=None, email=None):
    if username is not None:
        if len(username) < 3:
            return "Username must be at least 3 characters long."
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return "Username can only contain letters, numbers, and underscores."
    
    if password is not None:
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$', password):
            return "Password must be at least 8 characters long and include uppercase, lowercase, a number, and a special character."
    
    if email is not None:
        if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
            return "Please provide a valid email address."
            
    return None

@app.route('/register', methods=['POST'])
@limiter.limit("3 per minute")
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()

    if not username or not password or not email:
        return jsonify({'error': 'All fields are required.'}), 400

    validation_error = validate_auth_input(username=username, password=password, email=email)
    if validation_error:
        return jsonify({'error': validation_error}), 400

    hashed = hashpw(password.encode('utf-8'), gensalt())
    password_history_json = json.dumps([hashed.decode('utf-8')])  # Store hash, not plain password
    
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    try:
        c.execute('INSERT INTO users (username, password, email, is_active, account_status, password_history, last_password_change, failed_attempts) VALUES (?, ?, ?, 0, ?, ?, ?, 0)', 
                  (username, hashed, email, 'pending', password_history_json, datetime.now().isoformat()))
        user_id = c.lastrowid
        conn.commit()
        activation_token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.now(timezone.utc) + timedelta(hours=1)
        }, app.config['SECRET_KEY'])
        send_forensic_email(email, activation_token, email_type="activation")
        conn.close()
        return jsonify({'message': 'Registration successful. Please check your email to activate your account, then wait for admin approval.'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Registration could not be completed. Please try a different username or email.'}), 400
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/captcha', methods=['GET'])
def get_captcha():
    captcha_id, code = generate_captcha()
    return jsonify({'captcha_id': captcha_id, 'question': code}), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'ForensicToolProject API'}), 200

@app.route('/activate', methods=['GET'])
def activate():
    token = request.args.get('token')
    if not token:
        return "<h2 style='color:red;'>Invalid activation link -- missing token</h2>", 400

    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = data['user_id']

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute('SELECT is_active FROM users WHERE id = ?', (user_id,))
        result = c.fetchone()

        if not result:
            conn.close()
            logger.warning(f"Activation failed: User ID {user_id} not found in database.")
            return f"<h2 style='color:red;'>Invalid user (ID: {user_id}) - Please re-register or use the correct link</h2>", 400

        frontend_url = os.getenv('FRONTEND_URL', 'https://forensic-tool-project.vercel.app')
        if result[0] == 1:
            conn.close()
            return f"""
            <div style="text-align:center; padding:50px; font-family:Arial;">
                <h1 style="color:green;">Account Already Activated!</h1>
                <p>You can now log in.</p>
                <a href="{frontend_url}/login" style="color:#1a73e8;">Go to Login -></a>
            </div>
            """, 200

        c.execute('UPDATE users SET is_active = 1, account_status = ? WHERE id = ?', ('pending', user_id))
        conn.commit()
        logger.info(f"User ID {user_id} activated successfully - pending admin approval")
        conn.close()

        return f"""
        <div style="text-align:center; padding:50px; font-family:Arial;">
            <h1 style="color:green;">Account Activated Successfully!</h1>
            <p>Your email has been verified. Please wait for admin to approve your account before logging in.</p>
            <a href="{frontend_url}/login" style="color:#1a73e8; font-size:18px;">Go to Login -></a>
        </div>
        """, 200

    except jwt.ExpiredSignatureError:
        return "<h2 style='color:red;'>Activation link expired. Please request a new one from login page.</h2>", 400
    except Exception as e:
        logger.error(f"Activation failed: {e}")
        return "<h2 style='color:red;'>Activation failed. Please try again.</h2>", 500

@app.route('/resend-activation', methods=['POST'])
def resend_activation():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT id FROM users WHERE email = ? AND is_active = 0', (email,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'No inactive account found with this email'}), 404

    token = jwt.encode({
        'user_id': user[0],
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }, app.config['SECRET_KEY'])

    send_forensic_email(email, token, email_type="activation")
    return jsonify({'message': 'New activation link sent! Check your inbox and spam folder.'}), 200

@app.route('/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT id FROM users WHERE email = ?', (email,))
    user = c.fetchone()
    conn.close()

    if not user:
        # Don't confirm if user exists or not for security, but we'll return success to prevent Phishing
        return jsonify({'message': 'If an account exists with this email, a reset link has been sent.'}), 200

    reset_token = jwt.encode({
        'user_id': user[0],
        'action': 'password_reset',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }, app.config['SECRET_KEY'])

    send_forensic_email(email, reset_token, email_type="reset")
    return jsonify({'message': 'A password reset link has been sent to your email.'}), 200

@app.route('/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400

    validation_error = validate_auth_input(password=new_password)
    if validation_error:
        return jsonify({'error': validation_error}), 400

    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        if decoded.get('action') != 'password_reset':
            return jsonify({'error': 'Invalid reset token'}), 400
        
        user_id = decoded['user_id']
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute('SELECT password, password_history FROM users WHERE id = ?', (user_id,))
        row = c.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        old_password_hash, password_history = row[0], row[1]
        
        # Ensure password hash is bytes
        if isinstance(old_password_hash, str):
            old_password_hash = old_password_hash.encode('utf-8')
            
        # Check if new password matches any in history
        if password_history:
            try:
                history_list = json.loads(password_history)
                for old_hash in history_list:
                    if isinstance(old_hash, str):
                        old_hash = old_hash.encode('utf-8')
                    if checkpw(new_password.encode('utf-8'), old_hash):
                        conn.close()
                        return jsonify({'error': 'New password cannot be any of your last 5 passwords.'}), 400
            except:
                pass

        # Hash new password and update history
        new_hash = hashpw(new_password.encode('utf-8'), gensalt())
        
        # Update password history
        if password_history:
            try:
                history_list = json.loads(password_history)
                history_list.append(new_hash.decode('utf-8'))
                # Keep only last N passwords
                history_list = history_list[-PASSWORD_HISTORY_SIZE:]
            except:
                history_list = [new_hash.decode('utf-8')]
        else:
            history_list = [new_hash.decode('utf-8')]
        
        new_history_json = json.dumps(history_list)
        
        c.execute('UPDATE users SET password = ?, password_history = ?, last_password_change = ? WHERE id = ?', 
                  (new_hash, new_history_json, datetime.now().isoformat(), user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Password reset successful. You can now log in.'}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Reset link expired'}), 400
    except Exception as e:
        return jsonify({'error': 'Invalid reset link'}), 400

@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    client_ip = request.remote_addr

    # Input type validation -- prevents operator-based injection payloads
    if not isinstance(username, str) or not isinstance(password, str):
        return jsonify({'error': 'Invalid input format'}), 400

    if not username or not password:
        log_audit(0, "login_failed", "Empty credentials")
        return jsonify({'error': 'Username and password required'}), 400

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT id, password, is_active, is_admin, account_status, failed_attempts, lockout_until FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    # Handle old database rows with fallback defaults
    user_id = user[0]
    stored_hash = user[1]
    is_active = user[2] if user[2] is not None else 0
    is_admin = user[3] if user[3] is not None else 0
    account_status = user[4] if user[4] and len(user) > 4 else 'active'
    failed_attempts = user[5] if len(user) > 5 and user[5] is not None else 0
    lockout_until = user[6] if len(user) > 6 and user[6] else None

    # Check if account is locked due to too many failed attempts
    if lockout_until:
        try:
            lockout_time = datetime.fromisoformat(lockout_until)
            if lockout_time > datetime.now():
                remaining_seconds = int((lockout_time - datetime.now()).total_seconds())
                log_audit(user_id, "login_blocked", f"Account locked, {remaining_seconds}s remaining")
                return jsonify({'error': f'Too many failed attempts. Try again in {remaining_seconds} seconds.'}), 403
            else:
                # Lockout expired, reset failed attempts
                c.execute('UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = ?', (user_id,))
                conn.commit()
        except:
            pass

    # Ensure password hash is bytes
    hashed_pw = stored_hash
    if isinstance(hashed_pw, str):
        hashed_pw = hashed_pw.encode('utf-8')

    if not checkpw(password.encode('utf-8'), hashed_pw):
        # Increment failed attempts
        new_failed_attempts = (failed_attempts or 0) + 1
        
        if new_failed_attempts >= 5:
            # Lock account for 15 minutes
            lockout_duration = 15 * 60  # 15 minutes in seconds
            lockout_until = (datetime.now() + timedelta(seconds=lockout_duration)).isoformat()
            c.execute('UPDATE users SET failed_attempts = ?, lockout_until = ? WHERE id = ?', 
                     (new_failed_attempts, lockout_until, user_id))
            conn.commit()
            conn.close()
            log_audit(user_id, "login_failed", f"Account locked after {new_failed_attempts} attempts")
            return jsonify({'error': 'Too many failed attempts. Account locked for 15 minutes.'}), 403
        else:
            c.execute('UPDATE users SET failed_attempts = ? WHERE id = ?', (new_failed_attempts, user_id))
            conn.commit()
            conn.close()
            log_audit(user_id, "login_failed", f"Incorrect password, attempt {new_failed_attempts}/5")
        return jsonify({'error': 'Invalid username or password'}), 401

    # Password correct - reset failed attempts
    c.execute('UPDATE users SET failed_attempts = 0, lockout_until = NULL, last_login = ?, last_login_ip = ? WHERE id = ?', 
              (datetime.now().isoformat(), client_ip, user_id))
    conn.commit()
    conn.close()

    if is_active == 0:
        log_audit(user_id, "login_failed", "Account not activated")
        return jsonify({'error': 'Account not activated. Please check your email for activation link.'}), 403

    # Check account status for approval requirement
    if account_status == 'pending':
        log_audit(user_id, "login_failed", "Account pending admin approval")
        return jsonify({'error': 'Your account is pending approval. Please wait for admin to approve your registration.'}), 403
    elif account_status == 'suspended':
        log_audit(user_id, "login_failed", "Account suspended")
        return jsonify({'error': 'Your account has been suspended. Contact admin for assistance.'}), 403

    # Generate JWT token with expiration
    token_expiry = datetime.now() + timedelta(hours=SESSION_TIMEOUT_HOURS)
    token = jwt.encode({
        'user_id': user_id,
        'username': username,
        'is_admin': is_admin,
        'exp': token_expiry
    }, app.config['SECRET_KEY'], algorithm='HS256')

    log_audit(user_id, "login_success", f"IP: {client_ip}")

    return jsonify({
        'token': token,
        'user_id': user_id,
        'username': username,
        'is_admin': is_admin,
        'expires_in': SESSION_TIMEOUT_HOURS * 3600
    }), 200

@app.route('/search-x-posts', methods=['POST'])
@token_required
@limiter.limit("20 per hour")
def search_x_posts(current_user):
    data = request.get_json()
    query = data.get('query')
    exact_match = data.get('exact_match', False)

    if not query:
        return jsonify({"error": "Search query is required"}), 400

    # Clean the query for X API compatibility
    # Remove characters that break X search syntax
    import re
    cleaned = query.strip()
    # Remove URLs (they cause search issues)
    cleaned = re.sub(r'https?://\S+', '', cleaned)
    # Remove special X search operators that could cause issues
    cleaned = re.sub(r'[&|!(){}[\]"\\]', ' ', cleaned)
    # Collapse multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    if not cleaned:
        return jsonify({"error": "Search query is empty after cleaning"}), 400

    if exact_match:
        # For exact match: use first few distinctive words as search, then filter
        words = cleaned.split()
        search_terms = ' '.join(words[:5])
        safe_query = search_terms
        max_results = 100
    else:
        # For general search: use the cleaned query as keywords (NO forced quotes)
        # This allows partial and fuzzy matching
        words = cleaned.split()
        if len(words) > 8:
            # For long queries, use first 8 words to stay within X limits
            safe_query = ' '.join(words[:8])
        else:
            safe_query = cleaned
        max_results = 10

    logger.info(f"X search - original: '{query[:80]}' | cleaned: '{safe_query[:80]}' | exact_match: {exact_match}")

    search_url = (
        f"https://api.x.com/2/tweets/search/recent?"
        f"query={requests.utils.quote(safe_query)}"
        f"&tweet.fields=created_at,author_id,text,conversation_id,entities,public_metrics"
        f"&expansions=author_id"
        f"&user.fields=username"
        f"&max_results={max_results}"
    )

    response = requests.get(search_url, headers=headers)

    if response.status_code != 200:
        logger.error(f"X search failed: {response.status_code} - {response.text}")
        error_detail = response.text
        # Provide user-friendly error messages
        if response.status_code == 403:
            return jsonify({"error": "X API access denied. Your API plan may not include search. Check your X Developer Portal."}), 403
        elif response.status_code == 429:
            return jsonify({"error": "X API rate limit reached. Please wait a few minutes before searching again."}), 429
        return jsonify({"error": "X search failed", "details": error_detail}), response.status_code

    results = response.json()
    logger.info(f"X search response: result_count={results.get('meta', {}).get('result_count', 0)}")

    # If exact_match is True, filter results to find the exact content
    if exact_match and 'data' in results:
        exact_posts = []
        for tweet in results['data']:
            if tweet.get('text', '') == query:
                exact_posts.append(tweet)

        if exact_posts:
            results['data'] = exact_posts
            results['meta']['result_count'] = len(exact_posts)
            logger.info(f"Found {len(exact_posts)} exact matches out of {len(results.get('data', []))} total")
        else:
            logger.warning(f"No exact match found for: {query[:80]}")
            results['data'] = []
            results['meta']['result_count'] = 0

    posts = []
    if 'data' in results:
        users = {u['id']: u['username'] for u in results.get('includes', {}).get('users', [])}
        for tweet in results['data']:
            metrics = tweet.get('public_metrics', {})
            posts.append({
                "post_id": tweet['id'],
                "text": tweet.get('text', ''),
                "author_username": users.get(tweet['author_id'], 'unknown'),
                "created_at": tweet['created_at'],
                "engagement": {
                    "retweets": metrics.get('retweet_count', 0),
                    "replies": metrics.get('reply_count', 0),
                    "likes": metrics.get('like_count', 0),
                    "quotes": metrics.get('quote_count', 0),
                    "views": metrics.get('impression_count', 0)
                }
            })

    log_audit(current_user, "search_x_posts", f"Query: {query}")
    return jsonify({"posts": posts})

@app.route('/fetch-x-post', methods=['POST'])
@token_required
@limiter.limit("20 per hour")
def fetch_x_post(current_user):
    try:
        data = request.get_json()
        post_id = data.get('post_id')
        if not post_id:
            return jsonify({"error": "Post ID required"}), 400

        # Request full context + entities + media
        url = (
            f"https://api.x.com/2/tweets/{post_id}?"
            f"expansions=author_id,attachments.media_keys,in_reply_to_user_id,referenced_tweets.id"
            f"&tweet.fields=created_at,conversation_id,text,entities,attachments,public_metrics"
            f"&user.fields=username"
            f"&media.fields=media_key,type,url,preview_image_url,variants"
        )
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return jsonify({"error": f"Failed to fetch post: {response.text}"}), response.status_code

        response_data = response.json()
        tweet_data = response_data.get('data', {})
        tweet_text = tweet_data.get('text', '')

        # Get full thread if this is part of a conversation
        if 'conversation_id' in tweet_data and tweet_data['conversation_id'] != post_id:
            # Optional: fetch full thread (advanced, add if needed)
            pass

        entities = tweet_data.get('entities', {})
        urls = entities.get('urls', []) or []
        created_at = tweet_data.get('created_at', '')
        author_id = tweet_data.get('author_id', '')
        expanded_text = expand_urls(tweet_text, urls)

        users = response_data.get('includes', {}).get('users', [])
        author_username = next((user['username'] for user in users if user['id'] == author_id), '')

        media_urls = []
        media = response_data.get('includes', {}).get('media', [])
        for media_item in media:
            if media_item.get('type') == 'photo' and media_item.get('url'):
                media_urls.append(media_item['url'])
            elif media_item.get('type') == 'video' and media_item.get('variants'):
                # Get highest bitrate video URL
                variants = media_item['variants']
                max_bitrate = max(variants, key=lambda v: v.get('bit_rate', 0))
                media_urls.append(max_bitrate['url'])

        # --- OCR Visual Analysis ---
        visual_data = process_visual_content(media_urls)
        visual_text = visual_data["text"]
        
        # We ALWAYS require confirmation if there are images, even if no text was found
        # This allows the user to see that the system "checked" the image.
        requires_confirmation = len(media_urls) > 0
        
        defamation_result = {"is_defamatory": False, "category": "Pending", "confidence": 0.0, "justification": "Awaiting human verification of media."}
        if not requires_confirmation:
            defamation_result = predict_defamatory(expanded_text)
        
        logger.info(f"Defamation scan for post {post_id}: {defamation_result}")

        metrics = tweet_data.get('public_metrics', {})
        logger.info(f"Raw X metrics for {post_id}: {metrics}")
        post_data = {
            "id": post_id,
            "text": expanded_text,
            "visual_text": visual_text,
            "visual_status": visual_data["status"],
            "requires_confirmation": requires_confirmation,
            "author_username": author_username,
            "created_at": created_at,
            "author_id": author_id,
            "media_urls": media_urls,
            "engagement": {
                "retweets": metrics.get('retweet_count', 0),
                "replies": metrics.get('reply_count', 0),
                "likes": metrics.get('like_count', 0),
                "quotes": metrics.get('quote_count', 0),
                "views": metrics.get('impression_count', 0)
            },
            "defamation": defamation_result
        }

        # Encrypt sensitive fields for DB storage
        enc_content = encrypt_field(expanded_text)
        enc_author = encrypt_field(author_username)
        enc_media = encrypt_field(json.dumps(media_urls))
        # Embed engagement metrics into content metadata string for full compliance storage
        engagement_json = json.dumps(post_data['engagement'])
        enc_engagement = encrypt_field(engagement_json)

        # Store fetch in DB (encrypted)
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO fetched_evidence (user_id, post_id, content, author_username, created_at, media_urls, timestamp, verified, engagement, is_defamatory, category, confidence) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (current_user, post_id, enc_content, enc_author, created_at, enc_media, datetime.now().isoformat(), None, enc_engagement, 1 if defamation_result.get('is_defamatory') else 0, defamation_result.get('category', 'Safe'), defamation_result.get('confidence', 0.0))
        )
        conn.commit()
        conn.close()

        log_audit(current_user, "fetch_x_post", f"Post ID: {post_id}")
        return jsonify(post_data), 200
    except Exception as e:
        logger.error(f"Error in fetch_x_post: {str(e)}")
        log_audit(current_user, "fetch_x_post_failed", f"Post ID: {post_id}, Error: {str(e)}")
        return jsonify({"error": f"Failed to fetch post. Check X API status: {str(e)}"}), 500

@app.route('/analyze-content', methods=['POST'])
@token_required
def analyze_content(current_user):
    try:
        data = request.get_json()
        tweet_text = data.get('tweet_text', '')
        visual_text = data.get('visual_text', '')
        
        if not tweet_text and not visual_text:
            return jsonify({"error": "No content provided for analysis"}), 400
        
        # Combined analysis for the primary flag
        full_content = (tweet_text + "\n" + visual_text).strip()
        result = predict_defamatory(full_content)
        
        # Attribution Logic: check where markers were found
        tweet_markers = extract_forensic_markers(tweet_text)
        visual_markers = extract_forensic_markers(visual_text)
        
        source = "Combined"
        if result['is_defamatory']:
            # Determine primary offender
            tweet_score = len(tweet_markers['ncic']) + len(tweet_markers['defamatory'])
            visual_score = len(visual_markers['ncic']) + len(visual_markers['defamatory'])
            
            if visual_score > tweet_score:
                source = "Media Attachment"
                result['justification'] = f"Primary evidence found inside Media: {result['justification']}"
            elif tweet_score > visual_score:
                source = "Tweet Text"
                result['justification'] = f"Primary evidence found in Tweet Text: {result['justification']}"
            else:
                source = "Both (Tweet & Media)"
        
        result['evidence_source'] = source
        
        # Update the is_defamatory flag in the database after human verification
        try:
            conn = sqlite3.connect('forensic.db')
            c = conn.cursor()
            # Find the most recent fetch for this user/content to update the flag
            # Note: In a more robust system, we'd pass the DB internal ID here
            # But since content is encrypted, we'll log the intention for now.
            # For this MVP, we'll assume the flag is set correctly during fetch or should be updated via specific ID.
            logger.info(f"Verified is_defamatory: {result['is_defamatory']} for user {current_user}")
            # If we had a fetched_id, we would do:
            # c.execute('UPDATE fetched_evidence SET is_defamatory = ? WHERE id = ?', (1 if result['is_defamatory'] else 0, fetched_id))
            conn.commit()
            conn.close()
        except Exception as db_e:
            logger.error(f"Failed to update defamation flag: {db_e}")

        log_audit(current_user, "analyze_content", f"Source: {source}")
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/store-evidence', methods=['POST'])
@token_required
@limiter.limit("20 per hour")
def store_evidence_endpoint(current_user):
    try:
        data = request.get_json()
        logger.info(f"Received data for storage: {data}")
        evidence_data = data.get('evidence')
        if not evidence_data:
            logger.error("Evidence data is required")
            return jsonify({"error": "Evidence data is required"}), 400

        if isinstance(evidence_data, str):
            evidence_data = json.loads(evidence_data)

        defamation = evidence_data.get("defamation", {"is_defamatory": False, "confidence": 0.0})
        
        valid_categories = ["Safe", "Defamatory", "Hate Speech"]
        defamation_category = defamation.get("category", "Safe")
        if defamation_category not in valid_categories:
            defamation_category = "Safe"
        defamation["category"] = defamation_category

        evidence_for_blockchain = {
            "post_id": evidence_data.get("id", "0"),
            "created_at": evidence_data.get("created_at", datetime.now().isoformat()),
            "investigator": str(current_user),
            "text": evidence_data.get("content", ""),
            "author_username": evidence_data.get("author_username", ""),
            "platform": evidence_data.get("platform", "Twitter"), # Default to Twitter for now
            "media_urls": evidence_data.get("media_urls", []),
            "engagement": evidence_data.get("engagement", {}), 
            "defamation": defamation
        }
        logger.info(f"Sending to blockchain: {evidence_for_blockchain}")

        result = store_evidence(evidence_for_blockchain)
        if not result or result.get('evidence_id') == -1:
            err_msg = result.get('error', 'Unknown failure')
            logger.error(f"Failed to store evidence: {err_msg}")
            log_audit(current_user, "store_evidence_failed", f"Evidence: {evidence_data.get('id','')}, Error: {err_msg}")
            return jsonify({"error": f"Blockchain storage failed: {err_msg}"}), 503 if "unavailable" in err_msg.lower() else 500

        tx_hash = result['tx_hash']
        eth_tx_hash = result['eth_tx_hash']
        evidence_id = result['evidence_id']

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO stored_evidence (user_id, evidence_id, tx_hash, eth_tx_hash, post_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            (current_user, str(evidence_id), tx_hash, eth_tx_hash, evidence_data.get("id"), datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        log_audit(current_user, "store_evidence_success", f"ID: {evidence_id}, TX: {tx_hash}")
        log_audit(current_user, "store_evidence_success", f"ID: {evidence_id}, TX: {tx_hash}")
        etherscan_url = f"https://sepolia.etherscan.io/tx/{eth_tx_hash}"
        return jsonify({
            "evidence_id": evidence_id,
            "tx_hash": tx_hash,
            "eth_tx_hash": eth_tx_hash,
            "etherscan_url": etherscan_url
        }), 200
    except Exception as e:
        logger.error(f"Error storing evidence: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get-evidence', methods=['POST'])
@token_required
def get_evidence_endpoint(current_user):
    try:
        data = request.get_json()
        evidence_id = data.get('evidence_id')
        if evidence_id is None or not str(evidence_id).isdigit():
            return jsonify({"error": "Valid evidence ID is required"}), 400

        evidence = get_evidence(int(evidence_id))
        if not evidence:
            return jsonify({"error": "Evidence not found"}), 404

        # Privacy Authorization Check
        is_authorized = False
        on_chain_investigator = str(evidence.get('investigator', ''))
        if on_chain_investigator == str(current_user):
            is_authorized = True
        else:
            # Fallback: check if the local DB has this evidence linked to this user
            # Useful for evidence stored before the investigator ID fix (e.g. legacy ID "2")
            try:
                conn = sqlite3.connect('forensic.db')
                c = conn.cursor()
                c.execute('SELECT user_id FROM stored_evidence WHERE evidence_id = ? LIMIT 1', (str(evidence_id),))
                row = c.fetchone()
                if row and str(row[0]) == str(current_user):
                    is_authorized = True
                    logger.info(f"Authorized via local DB fallback (Blockchain ID: {on_chain_investigator}, User: {current_user})")
                conn.close()
            except Exception as e:
                logger.error(f"Fallback auth check failed: {e}")

        if not is_authorized:
            log_audit(current_user, "unauthorized_retrieval_attempt", f"Evidence ID: {evidence_id}")
            return jsonify({"error": f"Unauthorized: You do not have permission to view this evidence (Blockchain ID: {on_chain_investigator})"}), 403

        # Integrity Verification Logic
        on_chain_hash = evidence.get('hash', '')
        content = evidence.get('content', '')
        author = evidence.get('author_username', '')
        timestamp = evidence.get('timestamp', '')
        
        is_verified = False
        calculated_hash = None
        verification_status = "skipped"
        engagement_data = {}

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        
        # 1. Find the local post_id linked to this evidence_id
        c.execute('SELECT post_id FROM stored_evidence WHERE evidence_id = ? LIMIT 1', (str(evidence_id),))
        stored_row = c.fetchone()
        
        if stored_row:
            post_id = stored_row[0]
            # 2. Get the full metadata from the original fetch
            c.execute('SELECT engagement FROM fetched_evidence WHERE post_id = ? LIMIT 1', (post_id,))
            fetch_row = c.fetchone()
            if fetch_row and fetch_row[0]:
                try:
                    engagement_data = json.loads(decrypt_field(fetch_row[0]))
                except Exception:
                    engagement_data = {}

            # 3. Recalculate hash for verification
            calculated_hash = generate_evidence_hash(content, author, post_id, timestamp)
            if calculated_hash == on_chain_hash:
                is_verified = True
                verification_status = "verified"
                c.execute('UPDATE fetched_evidence SET verified = 1 WHERE post_id = ?', (post_id,))
            else:
                verification_status = "tampered"
                c.execute('UPDATE fetched_evidence SET verified = 0 WHERE post_id = ?', (post_id,))

        c.execute(
            'INSERT INTO requests_log (user_id, request_type, timestamp) VALUES (?, ?, ?)',
            (current_user, 'retrieval', datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        # Reconstruction of the defamation object for UI compatibility
        defamation_data = {
            "is_defamatory": evidence.get('category') != 'Safe',
            "category": evidence.get('category', 'Safe'),
            "confidence": evidence.get('confidence', 0.0),
            "justification": evidence.get('justification', "Retrieved from blockchain record.")
        }

        evidence_data = {
            "evidence_id": evidence_id,
            "id": on_chain_hash,
            "text": content,
            "author_username": author,
            "investigator": evidence.get('investigator', ''),
            "created_at": timestamp,
            "media_urls": evidence.get('mediaUrls', []),
            "engagement": evidence.get('engagement', engagement_data), # Prioritize on-chain engagement
            "defamation": defamation_data,
            "verification": {
                "is_verified": is_verified,
                "status": verification_status,
                "calculated_hash": calculated_hash,
                "on_chain_hash": on_chain_hash
            }
        }

        log_audit(current_user, "retrieve_evidence_by_id", f"Evidence ID: {evidence_id}")
        return jsonify({"evidence_id": evidence_id, "data": evidence_data}), 200
    except Exception as e:
        logger.error(f"Failed to retrieve evidence: {str(e)}")
        return jsonify({"error": f"Failed to retrieve evidence: {str(e)}"}), 500

@app.route('/retrieve-evidence', methods=['POST'])
@token_required
def retrieve_evidence(current_user):
    try:
        data = request.get_json()
        tx_hash = data.get('transaction_hash')
        if not tx_hash:
            return jsonify({"error": "Transaction hash is required"}), 400

        normalized_tx_hash = tx_hash if tx_hash.startswith('0x') else f'0x{tx_hash}'
        if len(normalized_tx_hash) != 66 or not re.match(r'^0x[0-9a-fA-F]{64}$', normalized_tx_hash):
            return jsonify({"error": "Invalid transaction hash format"}), 400

        # Check if this is an Ethereum transaction hash stored in our local DB
        # This allows users to search by the transaction hash they see in their wallet
        lookup_hash = normalized_tx_hash
        try:
            conn = sqlite3.connect('forensic.db')
            c = conn.cursor()
            c.execute('SELECT tx_hash FROM stored_evidence WHERE eth_tx_hash = ? LIMIT 1', (normalized_tx_hash,))
            row = c.fetchone()
            if row and row[0]:
                lookup_hash = row[0]
                logger.info(f"Mapping Ethereum TX hash {normalized_tx_hash} to contract hash {lookup_hash}")
            conn.close()
        except Exception as db_err:
            logger.warning(f"Database lookup failed during hash normalization: {str(db_err)}")

        evidence = get_evidence_by_tx_hash(lookup_hash)
        if not evidence:
            return jsonify({"error": "Evidence not found for transaction hash"}), 404

        # Privacy Authorization Check
        is_authorized = False
        on_chain_investigator = str(evidence.get('investigator', ''))
        if on_chain_investigator == str(current_user):
            is_authorized = True
        else:
            # Fallback: check against local DB using the evidence hash
            try:
                conn = sqlite3.connect('forensic.db')
                c = conn.cursor()
                # On-chain 'hash' is stored in localDB 'tx_hash' column
                c.execute('SELECT user_id FROM stored_evidence WHERE tx_hash = ? LIMIT 1', (on_chain_hash,))
                row = c.fetchone()
                if row and str(row[0]) == str(current_user):
                    is_authorized = True
                    logger.info(f"Authorized TX via local DB fallback (Blockchain ID: {on_chain_investigator}, User: {current_user})")
                conn.close()
            except Exception as e:
                logger.error(f"Fallback TX auth check failed: {e}")

        if not is_authorized:
            log_audit(current_user, "unauthorized_retrieval_attempt", f"TX: {normalized_tx_hash}")
            return jsonify({"error": f"Unauthorized: You do not have permission to view this evidence (Blockchain ID: {on_chain_investigator})"}), 403

        # Integrity Verification Logic
        on_chain_hash = evidence.get('hash', '')
        content = evidence.get('content', '')
        author = evidence.get('author_username', '')
        timestamp = evidence.get('timestamp', '')
        evidence_id = evidence.get('evidence_id', '')
        
        is_verified = False
        calculated_hash = None
        verification_status = "skipped"
        engagement_data = {}

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        # 1. Find the local post_id linked to this on_chain_hash
        c.execute('SELECT post_id FROM stored_evidence WHERE tx_hash = ? LIMIT 1', (on_chain_hash,))
        stored_row = c.fetchone()
        
        if stored_row:
            post_id = stored_row[0]
            # 2. Get local metadata
            c.execute('SELECT engagement FROM fetched_evidence WHERE post_id = ? LIMIT 1', (post_id,))
            fetch_row = c.fetchone()
            if fetch_row and fetch_row[0]:
                try:
                    engagement_data = json.loads(decrypt_field(fetch_row[0]))
                except Exception:
                    engagement_data = {}

            # 3. Verify
            calculated_hash = generate_evidence_hash(content, author, post_id, timestamp)
            if calculated_hash == on_chain_hash:
                is_verified = True
                verification_status = "verified"
                c.execute('UPDATE fetched_evidence SET verified = 1 WHERE post_id = ?', (post_id,))
            else:
                verification_status = "tampered"
                c.execute('UPDATE fetched_evidence SET verified = 0 WHERE post_id = ?', (post_id,))

        c.execute(
            'INSERT INTO requests_log (user_id, request_type, timestamp) VALUES (?, ?, ?)',
            (current_user, 'retrieval', datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        # Reconstruction for UI
        defamation_data = {
            "is_defamatory": evidence.get('category') != 'Safe',
            "category": evidence.get('category', 'Safe'),
            "confidence": evidence.get('confidence', 0.0),
            "justification": evidence.get('justification', "Retrieved from blockchain record.")
        }

        evidence_data = {
            "evidence_id": evidence_id,
            "id": on_chain_hash,
            "text": content,
            "author_username": author,
            "investigator": evidence.get('investigator', ''),
            "created_at": timestamp,
            "media_urls": evidence.get('mediaUrls', []),
            "engagement": evidence.get('engagement', engagement_data),
            "defamation": defamation_data,
            "verification": {
                "is_verified": is_verified,
                "status": verification_status,
                "calculated_hash": calculated_hash,
                "on_chain_hash": on_chain_hash
            }
        }

        log_audit(current_user, "retrieve_evidence_by_hash", f"TX: {normalized_tx_hash}")
        return jsonify(evidence_data), 200
    except Exception as e:
        logger.error(f"Failed to retrieve evidence by tx hash: {str(e)}")
        return jsonify({"error": f"Failed to retrieve evidence: {str(e)}"}), 500

@app.route('/get-tx-hash', methods=['POST'])
@token_required
def get_tx_hash(current_user):
    try:
        data = request.get_json()
        evidence_id = data.get('evidence_id')
        if evidence_id is None or not str(evidence_id).isdigit():
            return jsonify({"error": "Valid evidence ID is required"}), 400

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'SELECT tx_hash, eth_tx_hash FROM stored_evidence WHERE evidence_id = ? AND user_id = ?',
            (evidence_id, current_user)
        )
        result = c.fetchone()
        conn.close()

        if not result:
            return jsonify({"error": "No transaction hash found for evidence ID"}), 404

        return jsonify({
            "evidence_id": evidence_id,
            "tx_hash": result[0],
            "eth_tx_hash": result[1]
        }), 200
    except Exception as e:
        logger.error(f"Failed to retrieve transaction hash: {str(e)}")
        return jsonify({"error": f"Failed to retrieve transaction hash: {str(e)}"}), 500

@app.route('/report/<user_id>', methods=['GET'])
@token_required
def report(current_user, user_id):
    logger.info(f'Report Access Check: current_user={current_user}, user_id_param={user_id}')
    if str(current_user) != str(user_id):
        return jsonify({'error': f'Unauthorized access (ID mismatch: {current_user} != {user_id})'}), 403

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category', 'all')
    action_type = request.args.get('action_type', 'all')

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    username = c.fetchone()[0]

    base_query = 'SELECT id, post_id, content, author_username, created_at, media_urls, timestamp, verified, category, confidence FROM fetched_evidence WHERE user_id = ?'
    params = [user_id]

    if start_date:
        if '/' in start_date:
            parts = start_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            start_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        base_query += ' AND timestamp >= ?'
        params.append(f"{start_date}T00:00:00")
    if end_date:
        if '/' in end_date:
            parts = end_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            end_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        base_query += ' AND timestamp <= ?'
        params.append(f"{end_date}T23:59:59")

    if category == 'Safe':
        base_query += ' AND (category IS NULL OR category = "Safe" OR category = "")'
    elif category and category != 'all':
        base_query += ' AND category = ?'
        params.append(category)

    if action_type == 'stored':
        base_query += ' AND verified = 1'
    elif action_type == 'fetched':
        base_query += ' AND (verified = 2 OR verified = 0)'

    c.execute(base_query, params)
    fetched = []
    for r in c.fetchall():
        try:
            content = decrypt_field(r[2])
            author = decrypt_field(r[3])
            media = json.loads(decrypt_field(r[5])) if r[5] else []
        except:
            content = ''
            author = ''
            media = []
        fetched.append({
            'id': r[0],
            'post_id': r[1],
            'content': content,
            'author_username': author,
            'created_at': r[4],
            'media_urls': media,
            'timestamp': r[6],
            'verified': r[7],
            'category': r[8] if r[8] else 'Pending',
            'confidence': r[9] if r[9] else 0.0
        })

    stored_query = '''
        SELECT s.id, s.evidence_id, s.tx_hash, s.eth_tx_hash, s.timestamp, s.post_id,
               f.content, f.author_username, f.category, f.confidence, f.engagement
        FROM stored_evidence s
        LEFT JOIN fetched_evidence f ON s.post_id = f.post_id
        WHERE s.user_id = ?
    '''
    stored_params = [user_id]

    if start_date:
        stored_query += ' AND s.timestamp >= ?'
        stored_params.append(f"{start_date}T00:00:00")
    if end_date:
        stored_query += ' AND s.timestamp <= ?'
        stored_params.append(f"{end_date}T23:59:59")
    if category == 'Safe':
        stored_query += ' AND (f.category IS NULL OR f.category = "Safe" OR f.category = "Pending" OR f.category = "")'
    elif category and category != 'all':
        stored_query += ' AND f.category = ?'
        stored_params.append(category)

    c.execute(stored_query, stored_params)
    stored = []
    for r in c.fetchall():
        try:
            content = decrypt_field(r[6]) if r[6] else ''
            author = decrypt_field(r[7]) if r[7] else ''
            engagement = json.loads(decrypt_field(r[10])) if r[10] else {}
        except:
            content = ''
            author = ''
            engagement = {}
        stored.append({
            'id': r[0],
            'evidence_id': r[1],
            'tx_hash': r[2],
            'eth_tx_hash': r[3],
            'timestamp': r[4],
            'post_id': r[5],
            'content': content,
            'author_username': author,
            'category': r[8] if r[8] else 'Pending',
            'confidence': r[9] if r[9] else 0.0,
            'engagement': engagement
        })

    conn.close()

    return jsonify({'username': username, 'fetched': fetched, 'stored': stored})

@app.route('/report-stats/<user_id>', methods=['GET'])
@token_required
def report_stats(current_user, user_id):
    logger.info(f'Report Access Check: current_user={current_user}, user_id_param={user_id}')
    if str(current_user) != str(user_id):
        return jsonify({'error': f'Unauthorized access (ID mismatch: {current_user} != {user_id})'}), 403

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()

    now = datetime.now()
    month_ago = now - timedelta(days=30)
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start - timedelta(seconds=1)

    def get_detailed_stats(start, end=None):
        # Use current_user (int) to ensure reliable matching
        uid = int(current_user)
        params = [uid, start.isoformat()]
        time_filter = "AND timestamp >= ?"
        if end:
            params.append(end.isoformat())
            time_filter = "AND timestamp >= ? AND timestamp < ?"
        
        # Scanned Count
        c.execute(f'SELECT COUNT(*) FROM fetched_evidence WHERE user_id = ? {time_filter}', params)
        scanned = c.fetchone()[0]
        
        # Secured Count
        c.execute(f'SELECT COUNT(*) FROM stored_evidence WHERE user_id = ? {time_filter}', params)
        secured = c.fetchone()[0]
        
        # Threats Count
        c.execute(f'SELECT COUNT(*) FROM fetched_evidence WHERE user_id = ? AND is_defamatory = 1 {time_filter}', params)
        threats = c.fetchone()[0]

        # Graph Data: Total Fetches for the period
        # Since requests_log might be empty, we use fetched_evidence records as activity proxy
        c.execute(f'SELECT COUNT(*) FROM fetched_evidence WHERE user_id = ? {time_filter}', params)
        fetches = c.fetchone()[0]
        
        # Graph Data: Total Secured for the period (as retrievals proxy)
        c.execute(f'SELECT COUNT(*) FROM stored_evidence WHERE user_id = ? {time_filter}', params)
        retrievals = c.fetchone()[0]

        # AI Category Breakdown
        c.execute(f'SELECT count(*) FROM fetched_evidence WHERE user_id = ? AND category = "Safe" {time_filter}', params)
        safe = c.fetchone()[0]
        c.execute(f'SELECT count(*) FROM fetched_evidence WHERE user_id = ? AND category = "Defamatory" {time_filter}', params)
        defamatory = c.fetchone()[0]
        c.execute(f'SELECT count(*) FROM fetched_evidence WHERE user_id = ? AND category = "Hate Speech" {time_filter}', params)
        hate_speech = c.fetchone()[0]

        return {
            'scanned': scanned, 
            'secured': secured, 
            'threats': threats,
            'fetches': fetches,
            'retrievals': retrievals,
            'categories': {
                'safe': safe,
                'defamatory': defamatory,
                'hate_speech': hate_speech
            }
        }

    monthly = get_detailed_stats(month_ago)
    weekly = get_detailed_stats(week_ago)
    yesterday = get_detailed_stats(yesterday_start, yesterday_end)
    today = get_detailed_stats(today_start)

    # 7-day daily breakdown for trend line chart
    trend = []
    for i in range(7):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1) - timedelta(seconds=1)
        stats = get_detailed_stats(day_start, day_end)
        trend.append({
            'date': day_start.strftime('%b %d'), # "Mar 24" format
            'fetches': stats['fetches'],
            'retrievals': stats['retrievals']
        })
    trend.reverse() # Oldest to newest (left to right on chart)

    conn.close()

    return jsonify({
        'monthly': monthly,
        'weekly': weekly,
        'daily': {
            'yesterday': yesterday,
            'today': today
        },
        'trend': trend
    })

@app.route('/generate-report/<user_id>', methods=['POST'])
@token_required
def generate_report(current_user, user_id):
    logger.info(f'Report Access Check: current_user={current_user}, user_id_param={user_id}')
    if str(current_user) != str(user_id):
        return jsonify({'error': f'Unauthorized access (ID mismatch: {current_user} != {user_id})'}), 403

    data = request.get_json() or {}
    charts = data.get('charts', {})
    chart_activity = charts.get('weekly', '')
    chart_daily = charts.get('daily', '')
    chart_harm = charts.get('harm', '')
    filters = data.get('filters', {})
    extended = data.get('extended', False)
    max_fetched = 10000 if extended else 1000
    max_stored = 5000 if extended else 500

    start_date = filters.get('start_date')
    end_date = filters.get('end_date')
    category = filters.get('category', 'all')
    action_type = filters.get('action_type', 'all')

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    username = c.fetchone()[0]
    report_subject = f"Activity Report for {username}"

    base_query = 'SELECT post_id, content, author_username, created_at, media_urls, timestamp, verified, category, confidence FROM fetched_evidence WHERE user_id = ?'
    params = [user_id]

    if start_date:
        if '/' in start_date:
            parts = start_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            start_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        base_query += ' AND timestamp >= ?'
        params.append(f"{start_date}T00:00:00")
    if end_date:
        if '/' in end_date:
            parts = end_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            end_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        base_query += ' AND timestamp <= ?'
        params.append(f"{end_date}T23:59:59")

    if category == 'Safe':
        base_query += ' AND (category IS NULL OR category = "Safe" OR category = "")'
    elif category and category != 'all':
        base_query += ' AND category = ?'
        params.append(category)

    if action_type == 'stored':
        base_query += ' AND verified = 1'
    elif action_type == 'fetched':
        base_query += ' AND (verified = 2 OR verified = 0)'

    c.execute(base_query, params)
    fetched = c.fetchall()

    decrypted_fetched = []
    for r in fetched:
        try:
            content = decrypt_field(r[1])
            author = decrypt_field(r[2])
            media = json.loads(decrypt_field(r[4])) if r[4] else []
        except:
            content = ''
            author = ''
            media = []
        decrypted_fetched.append((
            r[0], content, author, r[3], media, r[5], r[6], r[7] or 'Pending', r[8] or 0.0
        ))
    fetched = decrypted_fetched

    stored_query = 'SELECT s.evidence_id, s.tx_hash, s.eth_tx_hash, s.timestamp, s.post_id, f.content, f.author_username, f.category, f.confidence FROM stored_evidence s LEFT JOIN fetched_evidence f ON s.post_id = f.post_id WHERE s.user_id = ?'
    stored_params = [user_id]

    if start_date:
        stored_query += ' AND s.timestamp >= ?'
        stored_params.append(f"{start_date}T00:00:00")
    if end_date:
        stored_query += ' AND s.timestamp <= ?'
        stored_params.append(f"{end_date}T23:59:59")

    c.execute(stored_query, stored_params)
    stored = c.fetchall()

    decrypted_stored = []
    for r in stored:
        try:
            content = decrypt_field(r[5]) if r[5] else ''
            author = decrypt_field(r[6]) if r[6] else ''
        except:
            content = ''
            author = ''
        decrypted_stored.append((r[0], r[1], r[2], r[3], r[4], content, author, r[7] or 'Pending', r[8] or 0.0))
    stored = decrypted_stored

    now = datetime.now()
    conn.close()

    log_audit(current_user, "generate_report", f"User: {user_id}")

    safe_count = sum(1 for item in fetched if item[7] == 'Safe')
    defamatory_count = sum(1 for item in fetched if item[7] == 'Defamatory')
    hate_count = sum(1 for item in fetched if item[7] == 'Hate Speech')

    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: auto; }}
            .header {{ text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }}
            h1 {{ color: #1a73e8; margin-bottom: 5px; }}
            .metadata {{ color: #666; font-size: 12px; margin-bottom: 20px; }}
            h2 {{ color: #1a73e8; border-left: 5px solid #1a73e8; padding-left: 10px; margin-top: 40px; }}
            .evidence {{ border: 1px solid #eee; padding: 15px; margin: 15px 0; border-radius: 8px; background: #fafafa; page-break-inside: avoid; }}
            .verified {{ color: #10b981; font-weight: bold; }}
            .not-verified {{ color: #ef4444; font-weight: bold; }}
            .skipped {{ color: #94a3b8; }}
            .charts-container {{ display: flex; flex-wrap: wrap; justify-content: space-around; margin-top: 30px; }}
            .chart-box {{ width: 45%; text-align: center; margin-bottom: 20px; page-break-inside: avoid; }}
            .chart-img {{ width: 100%; border: 1px solid #ddd; border-radius: 8px; }}
            .footer {{ margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Forensic Evidence Dossier</h1>
            <p>{report_subject}</p>
            <div class="metadata">
                Date Generated: {now.strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>

        <div class="filters">
            <span class="filter-tag">Category: {category}</span>
            <span class="filter-tag">Action: {action_type}</span>
            {f'<span class="filter-tag">From: {start_date}</span>' if start_date else ''}
            {f'<span class="filter-tag">To: {end_date}</span>' if end_date else ''}
        </div>

        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">{len(fetched)}</div><div class="stat-label">Scans</div></div>
            <div class="stat-card"><div class="stat-value">{len(stored)}</div><div class="stat-label">Stored</div></div>
            <div class="stat-card"><div class="stat-value">{defamatory_count + hate_count}</div><div class="stat-label">Flagged</div></div>
            <div class="stat-card"><div class="stat-value">{safe_count}</div><div class="stat-label">Safe</div></div>
        </div>

        {(f'''<h2>Forensic Analytics</h2>
        <div class="charts-container">
            {f'<div class="chart-box"><h3>7-Day Activity</h3><img class="chart-img" src="data:image/png;base64,{chart_activity}" /></div>' if chart_activity else ''}
            {f'<div class="chart-box"><h3>Daily Fetches</h3><img class="chart-img" src="data:image/png;base64,{chart_daily}" /></div>' if chart_daily else ''}
            {f'<div class="chart-box"><h3>Harm Assessment</h3><img class="chart-img" src="data:image/png;base64,{chart_harm}" /></div>' if chart_harm else ''}
        </div>''') if chart_activity or chart_daily or chart_harm else ''}

        <h2>Captured Evidence Intelligence ({len(fetched)})</h2>
        {''.join([
            f"<div class='evidence'>"
            f"<p><strong>Network Post ID:</strong> {r[0]}</p>"
            f"<p><strong>Extracted Content:</strong> <i style='color: #444;'>{r[1]}</i></p>"
            f"<p><strong>Subject Handle:</strong> @{r[2]}</p>"
            f"<p><strong>Post Timestamp:</strong> {r[3]}</p>"
            f"<p><strong>Category:</strong> {r[7]}</p>"
            f"<p><strong>AI Confidence:</strong> {r[8]:.2%}</p>"
            f"<p><strong>System Log Time:</strong> {r[5]}</p>"
            f"<p><strong>Integrity Status:</strong> "
            f"<span class='{ 'verified' if r[6]==1 else 'not-verified' if r[6]==0 else 'skipped' }'>"
            f"{ 'Verified: Cryptographically Matches' if r[6]==1 else 'Alert: Potential Hash Mismatch' if r[6]==0 else 'Pending Verification' }</span></p>"
            "</div>"
            for r in fetched[:max_fetched]
        ])}

        <h2>Immutable Blockchain Anchor Log</h2>
        {''.join([
            f"<div class='evidence'><p><strong>Evidence Vault UID:</strong> {r[0]}</p>"
            f"<p><strong>Internal Storage Hash:</strong> <code style='font-size: 10px;'>{r[1]}</code></p>"
            f"<p><strong>Ethereum On-Chain Hash (Sepolia):</strong> <code style='font-size: 10px;'>{r[2]}</code></p>"
            f"<p><strong>Content:</strong> <i>{r[5]}</i></p>"
            f"<p><strong>Author:</strong> @{r[6]}</p>"
            f"<p><strong>Category:</strong> {r[7]}</p>"
            f"<p><strong>Anchored At:</strong> {r[3]}</p></div>"
            for r in stored[:max_stored]
        ])}

        <div class="footer">
            <p>This document contains cryptographically secured forensic evidence from ChainForensix.<br/>
            Any alteration to the digital content will invalidate the on-chain anchor.</p>
        </div>
    </body>
    </html>
    """

    try:
        pdf = generate_pdf(html_content)
    except Exception as e:
        return jsonify({'error': 'PDF generation failed', 'details': str(e)}), 500

    response = make_response(pdf)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=forensic_report_{user_id}.pdf'
    return response

# ===============================================================
# =================== CHATBOT ENDPOINTS ========================
# ===============================================================

import uuid

# -- Knowledge Base --
CHATBOT_KB = {
    "greeting": {
        "keywords": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings"],
        "response": "Welcome to ChainForensix! I'm your digital forensics assistant. I can help you with:\n\n* Understanding how our platform works\n* Troubleshooting errors you might encounter\n* Guiding you through the analysis workflow\n* Scheduling a consultation with a forensic expert\n\nHow can I assist you today?"
    },
    "what_is": {
        "keywords": ["what is chainforensix", "what does this do", "what is this platform", "what do you do", "about", "purpose", "explain the system"],
        "response": "ChainForensix is an AI-powered forensic evidence platform for social media content. Here's what we do:\n\n1. **Fetch & Capture** -- Scrape X (Twitter) posts with full metadata\n2. **AI Analysis** -- Our Afro-XLMR model classifies content as Safe, Defamatory, or Hate Speech\n3. **Blockchain Anchoring** -- Store evidence immutably on Ethereum (Sepolia) for legal integrity\n4. **Verification** -- Retrieve and cryptographically verify stored evidence\n5. **Reporting** -- Generate forensic reports with full audit trails\n\nWould you like to know more about any of these features?"
    },
    "how_it_works": {
        "keywords": ["how does it work", "how it works", "workflow", "process", "steps", "how to use"],
        "response": "Here's the ChainForensix workflow:\n\n**Step 1: Login Register** -- Create an account and verify your email\n**Step 2: Fetch a Post** -- Go to the Analysis page, enter an X Post ID or search by content\n**Step 3: AI Classification** -- Our model analyzes the content for defamatory or hate speech patterns\n**Step 4: Store on Blockchain** -- Click 'Secure on Blockchain' to create an immutable evidence record\n**Step 5: Retrieve and Verify** -- Use the Evidence page to retrieve and verify stored evidence\n**Step 6: Generate Reports** -- Create professional forensic reports from the Reports page\n\nNeed help with a specific step?"
    },
    "fetch_help": {
        "keywords": ["fetch", "scrape", "post id", "how to fetch", "analysis page", "find a post", "get a tweet"],
        "response": "To fetch an X post for analysis:\n\n1. Navigate to the **Analysis** page (you must be logged in)\n2. Enter the **Post ID** -- this is the number at the end of a tweet URL (e.g., from twitter.com/user/status/**1234567890**)\n3. Or use **Search by Content** -- paste the text from the post and we'll find matching tweets\n4. Click **Initialize Forensic Fetch**\n5. Review the AI analysis results\n6. Click **Secure on Blockchain** to store the evidence\n\nHaving trouble? Let me know the specific error you're seeing."
    },
    "blockchain_help": {
        "keywords": ["blockchain", "store evidence", "ethereum", "sepolia", "smart contract", "immutable", "tx hash", "transaction"],
        "response": "ChainForensix uses the **Ethereum Sepolia testnet** to store evidence:\n\n* Each piece of evidence gets a unique **Evidence ID** and **Transaction Hash**\n* The content hash is stored on-chain -- making it tamper-proof\n* You can verify any evidence by checking the hash on Sepolia Etherscan\n* The blockchain record proves the evidence existed at a specific point in time\n\nNote: Blockchain storage may take 15-30 seconds depending on network conditions. If you see a timeout error, try again in a moment."
    },
    "retrieve_help": {
        "keywords": ["retrieve", "verify", "evidence page", "get evidence", "check evidence", "verification"],
        "response": "To retrieve and verify stored evidence:\n\n1. Go to the **Evidence** page\n2. Your stored evidence will be listed automatically\n3. Click on any evidence entry to see full details\n4. The system re-calculates the content hash and compares it to the blockchain record\n5. A green checkmark means the evidence is intact and verified\n\nYou can also search by Evidence ID or Transaction Hash."
    },
    "report_help": {
        "keywords": ["report", "generate report", "pdf", "forensic report", "download report", "reports page"],
        "response": "To generate a forensic report:\n\n1. Go to the **Reports** page\n2. View your analysis statistics and activity metrics\n3. Click **Generate Report** to create a professional PDF\n4. The report includes: evidence summary, AI classification results, blockchain verification, and audit trail\n\nReports are downloadable as PDF files for legal or investigative use."
    },
    "pricing": {
        "keywords": ["pricing", "cost", "how much", "free", "paid", "subscription", "plans"],
        "response": "ChainForensix is currently available for use. For detailed pricing information and enterprise plans, I'd recommend speaking with one of our experts who can tailor a solution to your needs.\n\nWould you like to schedule a consultation with a forensic expert?"
    },
    "schedule": {
        "keywords": ["schedule", "appointment", "consultation", "book", "meeting", "call"],
        "response": "__SCHEDULE_FORM__"
    },
    "talk_to_expert": {
        "keywords": ["talk to expert", "human", "real person", "speak to someone", "support agent", "talk to someone", "human expert", "speak to expert"],
        "response": "__ESCALATE__"
    },
    "methodology": {
        "keywords": ["methodology", "ai model", "afro-xlmr", "how does the ai work", "classification", "machine learning", "nlp"],
        "response": "Our AI engine uses **Afro-XLMR**, a multilingual transformer model optimized for African languages:\n\n* **3-Class Classification**: Safe, Defamatory, Hate Speech\n* **Forensic Lexicons**: Custom dictionaries for Kenyan political speech, NCIC-monitored terms, and security-related language\n* **Dual-Evidence Analysis**: Analyzes both tweet text and OCR-extracted text from images\n* **Confidence Scoring**: Provides probability scores for each classification category\n\nYou can read more on our Methodology page. Need more technical details?"
    }
}

# -- Error Troubleshooting Knowledge Base --
ERROR_KB = {
    "rate_limit": {
        "keywords": ["too many requests", "429", "rate limit", "rate-limit", "ratelimit", "slow down", "limit exceeded"],
        "response": "**Rate Limit Error (429 -- Too Many Requests)**\n\nThis happens when you've made too many API calls in a short period. Our limits are:\n* 200 requests per day\n* 50 requests per hour\n* 20 search queries per hour\n\n**What to do:**\n1. Wait 10-15 minutes before trying again\n2. Avoid rapid-fire submissions -- wait for each request to complete\n3. Use Post ID instead of text search when possible (it's more efficient)\n4. If you need higher limits for professional use, consider scheduling a consultation\n\nThe rate limit resets automatically."
    },
    "auth_expired": {
        "keywords": ["token expired", "token has expired", "session expired", "logged out", "expired"],
        "response": "**Session Expired**\n\nYour login session lasts 24 hours. When it expires:\n\n1. You'll be redirected to the login page\n2. Simply log in again with your credentials\n3. Your evidence and reports are safely stored and will be there when you return\n\nTip: If this happens frequently, make sure your browser isn't clearing cookies automatically."
    },
    "auth_missing": {
        "keywords": ["token is missing", "401", "unauthorized", "not authenticated", "missing token"],
        "response": "**Authentication Error (401)**\n\nThis means you're not logged in or your session is invalid.\n\n**What to do:**\n1. Go to the **Login** page and sign in\n2. If you just registered, check your email for the **activation link** first\n3. Make sure cookies are enabled in your browser\n4. Try clearing your browser cache and logging in again\n\nStill having issues? I can connect you with our support team."
    },
    "account_not_activated": {
        "keywords": ["not activated", "403", "activation", "activate account", "check your email", "activation link"],
        "response": "**Account Not Activated (403)**\n\nYour account exists but hasn't been activated yet.\n\n**What to do:**\n1. Check your email inbox (and spam/junk folder) for the activation email from ChainForensix\n2. Click the activation link in the email\n3. If you can't find it, go to the Login page and click **'Resend Activation Email'**\n4. The activation link expires after 1 hour -- request a new one if needed\n\nOnce activated, you can log in normally."
    },
    "network_error": {
        "keywords": ["network error", "connection", "could not connect", "timeout", "server down", "unreachable", "fetch failed"],
        "response": "**Network / Connection Error**\n\nThis usually means the server is temporarily unreachable.\n\n**What to do:**\n1. Check your internet connection\n2. Try refreshing the page\n3. Wait 30 seconds and try again -- our server may be restarting\n4. If using the system for the first time after a period of inactivity, the server may need 1-2 minutes to wake up (we use Render free tier)\n\nIf the problem persists for more than 5 minutes, it may be a server issue."
    },
    "blockchain_error": {
        "keywords": ["error storing", "blockchain error", "store error", "store failed", "eth_tx_hash", "smart contract", "gas"],
        "response": "**Blockchain Storage Error**\n\nThis can happen due to Ethereum network congestion or configuration issues.\n\n**What to do:**\n1. Wait 30-60 seconds and try the 'Secure on Blockchain' button again\n2. Check that the post was fetched successfully (you need fetched data first)\n3. If you see 'gas' related errors -- the network might be congested, try again later\n4. The evidence is still saved in our database even if the blockchain step fails\n\nNeed urgent help? I can escalate this to our technical team."
    },
    "analysis_error": {
        "keywords": ["error analyzing", "analysis failed", "model error", "prediction error", "ai error", "classification error"],
        "response": "**AI Analysis Error**\n\nThe forensic AI model encountered an issue during content classification.\n\n**What to do:**\n1. Try submitting the content again\n2. If the post contains only images with no text, the OCR model may need to initialize first\n3. Very short text (< 5 characters) may not produce reliable results\n4. If the error persists, the model service may be restarting\n\nThe system defaults to 'Safe' classification when the model is unavailable, so no data is lost."
    },
    "registration_error": {
        "keywords": ["registration failed", "registration error", "can't register", "signup failed", "username taken", "password requirements"],
        "response": "**Registration Error**\n\nCommon registration issues:\n\n**Username requirements:**\n* At least 3 characters\n* Only letters, numbers, and underscores\n\n**Password requirements:**\n* At least 8 characters\n* Must include: uppercase, lowercase, number, and special character (@$!%*?&)\n\n**Other issues:**\n* Username or email already in use -- try a different one\n* Make sure all fields are filled in\n\nNeed a human to help you? I can connect you with support."
    },
    "password_reset": {
        "keywords": ["forgot password", "reset password", "can't login", "wrong password", "reset link", "password reset"],
        "response": "**Password Reset**\n\n1. Go to the **Login** page\n2. Click **'Forgot Password?'**\n3. Enter your registered email address\n4. Check your inbox (and spam folder) for the reset link\n5. Click the link and set a new password\n\n**Note:** The reset link expires in 1 hour. Your new password must meet the same requirements as registration (8+ chars, mixed case, number, special character)."
    },
    "generic_error": {
        "keywords": ["error", "something went wrong", "not working", "broken", "issue", "problem", "bug", "fail"],
        "response": "I see you're experiencing an issue. To help you better, could you tell me:\n\n1. **Which page** are you on? (Analysis, Evidence, Reports, Login)\n2. **What were you trying to do?** (Fetching a post, storing evidence, generating a report)\n3. **What's the exact error message** you're seeing?\n\nOr you can paste the error text here and I'll help diagnose it.\n\nIf you'd prefer, I can connect you with a human expert who can help directly."
    }
}

# -- Page-Context Error Mapping (for authenticated users) --
PAGE_CONTEXT_HELP = {
    "analyze": {
        "context": "Analysis / Fetch page",
        "common_errors": [
            "**Too Many Requests (429):** You've hit the rate limit. Wait 10-15 min or use Post ID instead of text search.",
            "**Network Error:** Server may be waking up. Wait 30 seconds and retry.",
            "**Post Not Found:** Double-check the Post ID -- it should be the number at the end of the tweet URL.",
            "**OCR Service Unavailable:** The image text reader is still initializing. You can manually enter text from images."
        ]
    },
    "retrieve": {
        "context": "Evidence Retrieval page",
        "common_errors": [
            "**No Evidence Found:** You may not have stored any evidence yet. Go to Analysis first.",
            "**Verification Failed:** The content hash doesn't match -- this could indicate tampering.",
            "**Network Error:** Server may be waking up. Wait and retry."
        ]
    },
    "report": {
        "context": "Reports page",
        "common_errors": [
            "**PDF Generation Failed:** The report service may need wkhtmltopdf installed on the server.",
            "**No Data:** You need to have analyzed and stored evidence before generating reports.",
            "**Metrics Showing Zero:** This is normal if you haven't performed any actions recently."
        ]
    },
    "login": {
        "context": "Login / Authentication",
        "common_errors": [
            "**Invalid Credentials:** Check your username and password for typos.",
            "**Account Not Activated:** Check your email for the activation link.",
            "**Rate Limited:** Too many login attempts. Wait a few minutes."
        ]
    }
}

def get_chatbot_response(message, page_context=None, is_authenticated=False):
    """Process user message and return an appropriate bot response."""
    msg_lower = message.lower().strip()
    
    # 1. Check for error-related queries first (higher priority when authenticated)
    if is_authenticated:
        # Check if the user is pasting an actual error message
        for key, entry in ERROR_KB.items():
            for kw in entry["keywords"]:
                if kw in msg_lower:
                    response = entry["response"]
                    # Append page-specific context if available
                    if page_context and page_context in PAGE_CONTEXT_HELP:
                        ctx = PAGE_CONTEXT_HELP[page_context]
                        response += f"\n\n---\n**Common issues on the {ctx['context']}:**\n"
                        response += "\n".join(f"* {e}" for e in ctx["common_errors"])
                    return {"type": "error_help", "response": response}
    
    # Also check errors for unauthenticated users (auth-related)
    for key, entry in ERROR_KB.items():
        for kw in entry["keywords"]:
            if kw in msg_lower:
                return {"type": "error_help", "response": entry["response"]}
    
    # 2. Check general knowledge base
    for key, entry in CHATBOT_KB.items():
        for kw in entry["keywords"]:
            if kw in msg_lower:
                resp = entry["response"]
                if resp == "__SCHEDULE_FORM__":
                    return {"type": "schedule", "response": "I'd be happy to help you schedule a consultation with one of our forensic experts. Please fill in the form below."}
                if resp == "__ESCALATE__":
                    return {"type": "escalate", "response": "I'll connect you with a human expert. Let me record our conversation so they have full context when they reach out to you. Please provide your contact details."}
                return {"type": "info", "response": resp}
    
    # 3. Page context help (when authenticated and on a specific page)
    if page_context and page_context in PAGE_CONTEXT_HELP:
        ctx = PAGE_CONTEXT_HELP[page_context]
        page_response = f"I see you're on the **{ctx['context']}**. Here are some common issues and solutions:\n\n"
        page_response += "\n".join(f"* {e}" for e in ctx["common_errors"])
        page_response += "\n\nCould you describe the specific issue you're facing? Or paste the error message you see."
        return {"type": "page_help", "response": page_response}
    
    # 4. Fallback
    return {
        "type": "fallback",
        "response": "I'm not sure I understand that question yet. Here's what I can help with:\n\n* **How ChainForensix works** -- ask me about the platform\n* **Troubleshooting errors** -- paste any error message and I'll help\n* **Feature guidance** -- ask about fetching, analysis, blockchain, or reports\n* **Schedule a consultation** -- book time with a forensic expert\n* **Talk to a human** -- I can escalate to our support team\n\nOr try asking in a different way!"
    }

# --- Chatbot Owner Notifications (Brevo/Sib API) ---
def send_owner_email(subject, html_content):
    """Send an email notification to the site owner using Brevo (Sib) API."""
    api_key = os.getenv('BREVO_API_KEY')
    if not api_key:
        logger.warning("BREVO_API_KEY not found in environment. Email notification skipped.")
        return False
        
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {"name": "ChainForensix Assistant", "email": "briannjoki619@gmail.com"},
        "to": [{"email": "briannjoki619@gmail.com", "name": "Forensic Expert"}],
        "subject": subject,
        "htmlContent": html_content
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code in [201, 202, 200]:
            logger.info(f"Owner notification email sent successfully: {subject}")
            return True
        else:
            logger.error(f"Failed to send Brevo email: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error sending Brevo email: {e}")
        return False

@app.route('/chatbot/message', methods=['POST'])
def chatbot_message():
    data = request.get_json()
    message = data.get('message', '').strip()
    session_id = data.get('session_id', str(uuid.uuid4()))
    page_context = data.get('page_context', '')
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    # Check if user is authenticated
    is_authenticated = False
    try:
        token = request.cookies.get('token') or (request.headers.get('Authorization', '').split(' ')[1] if request.headers.get('Authorization', '').startswith('Bearer ') else None)
        if token:
            jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            is_authenticated = True
    except:
        pass
    
    # Get response from the knowledge engine
    result = get_chatbot_response(message, page_context, is_authenticated)
    
    # Store the conversation
    try:
        timestamp = datetime.now().isoformat()
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute('INSERT INTO chatbot_conversations (session_id, role, message, page_context, timestamp) VALUES (?, ?, ?, ?, ?)',
                  (session_id, 'user', message, page_context, timestamp))
        c.execute('INSERT INTO chatbot_conversations (session_id, role, message, page_context, timestamp) VALUES (?, ?, ?, ?, ?)',
                  (session_id, 'bot', result['response'], page_context, timestamp))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Chatbot conversation logging failed: {e}")
    
    return jsonify({
        'response': result['response'],
        'type': result['type'],
        'session_id': session_id
    }), 200

@app.route('/chatbot/schedule', methods=['POST'])
def chatbot_schedule():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    topic = data.get('topic', '').strip()
    preferred_date = data.get('preferred_date', '').strip()
    preferred_time = data.get('preferred_time', '').strip()
    msg = data.get('message', '').strip()
    session_id = data.get('session_id', '')
    
    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400
    
    # Validate email format
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
        return jsonify({'error': 'Please provide a valid email address'}), 400
    
    try:
        timestamp = datetime.now().isoformat()
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO expert_appointments (name, email, phone, topic, preferred_date, preferred_time, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (name, email, phone, topic, preferred_date, preferred_time, msg, 'pending', timestamp)
        )
        conn.commit()
        conn.close()
        
        # Log in chatbot conversation
        if session_id:
            conn = sqlite3.connect('forensic.db')
            c = conn.cursor()
            c.execute('INSERT INTO chatbot_conversations (session_id, role, message, timestamp) VALUES (?, ?, ?, ?)',
                      (session_id, 'system', f'Appointment scheduled: {name}, {email}, {topic}', timestamp))
            conn.commit()
            conn.close()
        
        # Notify owner via email
        email_subject = f"New Consultation: {name} - {topic}"
        email_body = f"""
        <h3>New Forensic Expert Consultation Requested</h3>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Phone:</strong> {phone}</p>
        <p><strong>Topic:</strong> {topic}</p>
        <p><strong>Preferred Date:</strong> {preferred_date}</p>
        <p><strong>Preferred Time:</strong> {preferred_time}</p>
        <p><strong>Message:</strong> {msg}</p>
        <hr>
        <p>This request was submitted via the ChainForensix Assistant Chatbot.</p>
        """
        send_owner_email(email_subject, email_body)
        
        return jsonify({
            'message': f'Appointment scheduled successfully! Our forensic expert will reach out to you at {email}.',
            'type': 'schedule_confirmed'
        }), 201
    except Exception as e:
        logger.error(f"Appointment scheduling failed: {e}")
        return jsonify({'error': 'Failed to schedule appointment. Please try again.'}), 500

@app.route('/chatbot/escalate', methods=['POST'])
def chatbot_escalate():
    data = request.get_json()
    session_id = data.get('session_id', '')
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    summary = data.get('summary', '').strip()
    
    if not email:
        return jsonify({'error': 'Email is required so our expert can reach you'}), 400
    
    try:
        timestamp = datetime.now().isoformat()
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        
        # Mark all messages in this session as escalated
        if session_id:
            c.execute('UPDATE chatbot_conversations SET escalated = 1 WHERE session_id = ?', (session_id,))
        
        # Store the escalation as an appointment with high priority
        c.execute(
            'INSERT INTO expert_appointments (name, email, phone, topic, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (name or 'Website Visitor', email, '', 'Live Support Request', 
             f'Escalated from chatbot. Session: {session_id}. Summary: {summary}', 
             'escalated', timestamp)
        )
        
        # Log the escalation
        c.execute('INSERT INTO chatbot_conversations (session_id, role, message, timestamp) VALUES (?, ?, ?, ?)',
                  (session_id, 'system', f'Conversation escalated to human expert. Contact: {email}', timestamp))
        
        conn.commit()
        conn.close()
        
        # Notify owner via email
        email_subject = f"HIGH PRIORITY: Chatbot Escalation from {email}"
        email_body = f"""
        <h3>Chatbot Escalation Support Request</h3>
        <p><strong>Visitor Email:</strong> {email}</p>
        <p><strong>Visitor Name:</strong> {name or 'Website Visitor'}</p>
        <p><strong>Session ID:</strong> {session_id}</p>
        <p><strong>Issue Summary / Conversation Content:</strong></p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
        {summary}
        </div>
        <hr>
        <p>Please review the full conversation in the dashboard and reach out to the visitor immediately.</p>
        """
        send_owner_email(email_subject, email_body)

        return jsonify({
            'message': f'Your conversation has been recorded and flagged for our expert team. A specialist will reach out to you at {email} as soon as possible.',
            'type': 'escalated'
        }), 200
    except Exception as e:
        logger.error(f"Chatbot escalation failed: {e}")
        return jsonify({'error': 'Failed to escalate. Please try again or email us directly at briannjoki619@gmail.com'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'message': 'Logged out'}), 200)
    response.delete_cookie('token', path='/')
    return response

# Create default admin user if not exists
def create_admin_user():
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    
    # Check if admin user already exists
    c.execute('SELECT id FROM users WHERE is_admin = 1')
    admin_exists = c.fetchone()
    
    if not admin_exists:
        # Create admin user
        admin_password = 'admin123'
        hashed_password = hashpw(admin_password.encode('utf-8'), gensalt())
        
        c.execute('''
            INSERT INTO users (username, password, email, is_active, is_admin, created_at) 
            VALUES (?, ?, ?, 1, 1, ?)
        ''', ('admin', hashed_password.decode('utf-8'), 'admin@forensix.local', datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        print('Created admin user: admin / admin123')
        return True
    else:
        conn.close()
        print('Admin user already exists - proceeding with existing user')
        return True

@app.route('/admin/stats', methods=['GET'])
@token_required
def admin_report_stats(current_user):
    # Check if admin
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT is_admin FROM users WHERE id = ?', (current_user,))
    is_admin = c.fetchone()[0]
    conn.close()
    if not is_admin:
        return jsonify({'error': 'Unauthorized'}), 403

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM users')
    total_users = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM fetched_evidence')
    total_scans = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM stored_evidence')
    total_secured = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM audit_logs')
    total_logs = c.fetchone()[0]
    conn.close()
    
    return jsonify({
        'total_users': total_users,
        'total_scans': total_scans,
        'total_secured': total_secured,
        'total_logs': total_logs
    })

@app.route('/admin/ai-stats', methods=['GET'])
@token_required
def admin_ai_stats(current_user):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    # Check if admin
    c.execute('SELECT is_admin FROM users WHERE id = ?', (current_user,))
    if not c.fetchone()[0]:
        conn.close()
        return jsonify({'error': 'Unauthorized'}), 403
    
    c.execute('SELECT category, COUNT(*) FROM fetched_evidence GROUP BY category')
    rows = c.fetchall()
    conn.close()
    
    stats = {
        'Safe': 0,
        'Defamatory': 0,
        'Hate Speech': 0
    }
    for r in rows:
        if r[0] in stats:
            stats[r[0]] = r[1]
        elif r[0] is None:
            stats['Safe'] += r[1]
            
    return jsonify(stats)

@app.route('/admin/users/pending', methods=['GET'])
@token_required
def admin_pending_users(current_user):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute("SELECT id, username, email, created_at FROM users WHERE account_status = 'pending'")
    rows = c.fetchall()
    conn.close()
    return jsonify({'users': [{'id': r[0], 'username': r[1], 'email': r[2], 'created_at': r[3]} for r in rows]})

@app.route('/admin/registration-status', methods=['GET'])
def admin_reg_status():
    return jsonify({'enabled': True})

@app.route('/admin/users', methods=['GET'])
@token_required
def admin_get_users(current_user):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT id, username, email, is_active, is_admin, account_status, failed_attempts, lockout_until, last_login, last_login_ip FROM users WHERE is_admin = 0')
    rows = c.fetchall()
    conn.close()
    return jsonify({'users': [
        {'id': r[0], 'username': r[1], 'email': r[2], 'is_active': r[3], 'is_admin': r[4], 
         'account_status': r[5], 'failed_attempts': r[6], 'lockout_until': r[7], 'last_login': r[8], 'last_login_ip': r[9]} 
        for r in rows
    ]})

@app.route('/admin/unlock-user/<int:user_id>', methods=['POST'])
@token_required
def admin_unlock_user(current_user):
    # Check if admin
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT is_admin FROM users WHERE id = ?', (current_user,))
    if not c.fetchone()[0]:
        conn.close()
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Unlock the user
    c.execute('UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    log_audit(current_user, "unlock_user", f"Unlocked user {user_id}")
    return jsonify({'message': 'User unlocked successfully'}), 200

@app.route('/admin/security-stats', methods=['GET'])
@token_required
def admin_security_stats(current_user):
    # Check if admin
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT is_admin FROM users WHERE id = ?', (current_user,))
    if not c.fetchone()[0]:
        conn.close()
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get security stats
    c.execute('SELECT COUNT(*) FROM users WHERE lockout_until IS NOT NULL')
    locked_count = c.fetchone()[0]
    
    c.execute('SELECT COUNT(*) FROM audit_logs WHERE action = "login_failed" AND timestamp > datetime("now", "-24 hours")')
    failed_logins_24h = c.fetchone()[0]
    
    c.execute('SELECT username, failed_attempts, lockout_until FROM users WHERE failed_attempts >= 3')
    suspicious_users = c.fetchall()
    
    c.execute('SELECT u.username, a.action, a.details, a.timestamp FROM audit_logs a JOIN users u ON a.user_id = u.id WHERE a.action LIKE "login_%" ORDER BY a.timestamp DESC LIMIT 20')
    recent_login_activity = c.fetchall()
    
    conn.close()
    
    return jsonify({
        'locked_accounts': locked_count,
        'failed_logins_24h': failed_logins_24h,
        'suspicious_users': [{'username': r[0], 'failed_attempts': r[1], 'lockout_until': r[2]} for r in suspicious_users],
        'recent_activity': [{'username': r[0], 'action': r[1], 'details': r[2], 'timestamp': r[3]} for r in recent_login_activity]
    }), 200

@app.route('/admin/activities', methods=['GET'])
@token_required
def admin_get_activities(current_user):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('''
        SELECT a.id, u.username, a.action, a.details, a.timestamp 
        FROM audit_logs a 
        JOIN users u ON a.user_id = u.id 
        ORDER BY a.timestamp DESC LIMIT 100
    ''')
    rows = c.fetchall()
    conn.close()
    return jsonify({'activities': [{'id': r[0], 'username': r[1], 'action': r[2], 'details': r[3], 'timestamp': r[4]} for r in rows]})

@app.route('/admin/report-stats', methods=['GET'])
@token_required
def admin_report_stats_preview(current_user):
    user_id = request.args.get('user_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    action_type = request.args.get('action_type')

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    now = datetime.now()

    base_query = 'SELECT COUNT(*) FROM fetched_evidence WHERE user_id IS NOT NULL'
    base_params = []
    if user_id and user_id != 'all':
        base_query += ' AND user_id = ?'
        base_params.append(user_id)
    if start_date:
        base_query += ' AND timestamp >= ?'
        base_params.append(f"{start_date}T00:00:00")
    if end_date:
        base_query += ' AND timestamp <= ?'
        base_params.append(f"{end_date}T23:59:59")
    if category and category != 'all':
        base_query += ' AND category = ?'
        base_params.append(category)
    if action_type == 'stored':
        base_query += ' AND verified = 1'
    elif action_type == 'fetched':
        base_query += ' AND (verified = 2 OR verified = 0)'

    params = list(base_params)
    c.execute(base_query, params)
    scanned = c.fetchone()[0]

    params = list(base_params)
    secured_query = 'SELECT COUNT(*) FROM stored_evidence s LEFT JOIN fetched_evidence f ON s.post_id = f.post_id WHERE s.user_id IS NOT NULL'
    secured_params = []
    if user_id and user_id != 'all':
        secured_query += ' AND s.user_id = ?'
        secured_params.append(user_id)
    if start_date:
        secured_query += ' AND s.timestamp >= ?'
        secured_params.append(f"{start_date}T00:00:00")
    if end_date:
        secured_query += ' AND s.timestamp <= ?'
        secured_params.append(f"{end_date}T23:59:59")
    if category and category != 'all':
        secured_query += ' AND f.category = ?'
        secured_params.append(category)
    c.execute(secured_query, secured_params)
    secured = c.fetchone()[0]

    threat_query = base_query + " AND category IN ('Defamatory', 'Hate Speech')"
    c.execute(threat_query, base_params)
    threats = c.fetchone()[0]

    dist_query = base_query.replace('SELECT COUNT(*)', 'SELECT category, COUNT(*)') + ' GROUP BY category'
    c.execute(dist_query, base_params)
    rows = c.fetchall()

    dist = {'Safe': 0, 'Defamatory': 0, 'Hate Speech': 0}
    for r in rows:
        cat = r[0] or 'Safe'
        if cat in dist:
            dist[cat] = r[1]

    # Handle NULL as Pending/Safe (unscanned content)
    if dist.get('Safe', 0) == 0 and dist.get('Pending', 0) == 0 and dist.get(None, 0) == 0:
        total_with_category = sum(dist.values())
        if scanned > total_with_category:
            dist['Safe'] = scanned - total_with_category

    safe_count = dist.get('Safe', 0) + dist.get('Pending', 0) + dist.get(None, 0)
    defamatory_count = dist.get('Defamatory', 0)
    hate_speech_count = dist.get('Hate Speech', 0)

    # Generate trend data for last 7 days
    trend = []
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(6, -1, -1):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1) - timedelta(seconds=1)
        c.execute('SELECT COUNT(*) FROM fetched_evidence WHERE user_id IS NOT NULL AND timestamp >= ? AND timestamp <= ?',
                  (day_start.isoformat(), day_end.isoformat()))
        day_scans = c.fetchone()[0]
        c.execute('SELECT COUNT(*) FROM stored_evidence s WHERE s.timestamp >= ? AND timestamp <= ?',
                  (day_start.isoformat(), day_end.isoformat()))
        day_stored = c.fetchone()[0]
        trend.append({'date': day_start.strftime('%b %d'), 'scanned': day_scans, 'secured': day_stored})

    conn.close()
    return jsonify({
        'totals': {'scanned': scanned, 'secured': secured, 'threats': threats},
        'categories': {'Safe': safe_count, 'Defamatory': defamatory_count, 'Hate Speech': hate_speech_count},
        'trend': trend
    })

@app.route('/admin/report/evidence', methods=['GET'])
@token_required
def admin_report_evidence(current_user, user_id=None):
    user_id = request.args.get('user_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category = request.args.get('category')
    action_type = request.args.get('action_type')

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()

    # Handle category filter - NULL means unscanned/Pending
    if category and category == 'Safe':
        cat_filter = " AND (category IS NULL OR category = 'Safe' OR category = 'Pending')"
    elif category and category != 'all':
        cat_filter = " AND category = ?"
        cat_params = [category]
    else:
        cat_filter = ""
        cat_params = []

    query = 'SELECT post_id, content, author_username, timestamp, category, verified FROM fetched_evidence WHERE user_id IS NOT NULL'
    params = []
    if user_id and user_id != 'all':
        query += ' AND user_id = ?'
        params.append(user_id)

    # Handle date formats - support DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD
    if start_date:
        if '/' in start_date:
            parts = start_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            start_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        query += ' AND timestamp >= ?'
        params.append(f"{start_date}T00:00:00")
    if end_date:
        if '/' in end_date:
            parts = end_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            end_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        query += ' AND timestamp <= ?'
        params.append(f"{end_date}T23:59:59")

    query += cat_filter
    params.extend(cat_params)

    if action_type == 'stored':
        query += ' AND verified = 1'
    elif action_type == 'fetched':
        query += ' AND (verified = 2 OR verified = 0)'

    query += ' ORDER BY timestamp DESC LIMIT 200'
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    evidence = [{
        'post_id': r[0],
        'content': decrypt_field(r[1]),
        'author_username': decrypt_field(r[2]),
        'timestamp': r[3],
        'category': r[4] if r[4] else 'Pending',
        'verified': r[5]
    } for r in rows]

    return jsonify({'evidence': evidence})

@app.route('/admin/generate-activity-report', methods=['POST'])
@token_required
def admin_gen_act_report(current_user):
    return admin_generate_activity_report(current_user)

@app.route('/admin/generate-report', methods=['POST'])
@token_required
def admin_gen_rep(current_user):
    data = request.get_json() or {}
    user_id = data.get('user_id')
    filters = data.get('filters', {})
    stats = data.get('stats', {})
    charts = data.get('charts', {})
    extended = data.get('extended', False)
    max_fetched = 10000 if extended else 1000
    max_stored = 5000 if extended else 500

    target_user_id = None if user_id == 'all' else user_id

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()

    if target_user_id:
        c.execute('SELECT username FROM users WHERE id = ?', (target_user_id,))
        row = c.fetchone()
        username = row[0] if row else 'Unknown'
    else:
        username = 'All Investigators'

    start_date = filters.get('start_date')
    end_date = filters.get('end_date')
    category = filters.get('category', 'all')
    action_type = filters.get('action_type', 'all')

    base_query = 'SELECT post_id, content, author_username, timestamp, category, verified FROM fetched_evidence WHERE user_id IS NOT NULL'
    params = []

    if target_user_id:
        base_query += ' AND user_id = ?'
        params.append(target_user_id)

    if start_date:
        if '/' in start_date:
            parts = start_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            start_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        base_query += ' AND timestamp >= ?'
        params.append(f"{start_date}T00:00:00")
    if end_date:
        if '/' in end_date:
            parts = end_date.split('/')
            if len(parts[2]) == 2:
                parts[2] = '20' + parts[2]
            end_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        base_query += ' AND timestamp <= ?'
        params.append(f"{end_date}T23:59:59")

    if category == 'Safe':
        base_query += ' AND (category IS NULL OR category = "Safe" OR category = "")'
    elif category and category != 'all':
        base_query += ' AND category = ?'
        params.append(category)

    if action_type == 'stored':
        base_query += ' AND verified = 1'
    elif action_type == 'fetched':
        base_query += ' AND (verified = 2 OR verified = 0)'

    c.execute(base_query, params)
    fetched_rows = c.fetchall()
    fetched = []
    for r in fetched_rows:
        try:
            fetched.append((r[0], decrypt_field(r[1]), decrypt_field(r[2]), r[3], r[4], r[5]))
        except:
            fetched.append((r[0], '', '', r[3], r[4], r[5]))

    stored_query = 'SELECT s.evidence_id, s.tx_hash, s.eth_tx_hash, s.timestamp FROM stored_evidence s WHERE s.user_id IS NOT NULL'
    stored_params = []
    if target_user_id:
        stored_query += ' AND s.user_id = ?'
        stored_params.append(target_user_id)
    if start_date:
        stored_query += ' AND s.timestamp >= ?'
        stored_params.append(f"{start_date}T00:00:00")
    if end_date:
        stored_query += ' AND s.timestamp <= ?'
        stored_params.append(f"{end_date}T23:59:59")
    if action_type == 'stored':
        pass

    c.execute(stored_query, stored_params)
    stored_rows = c.fetchall()
    stored = [(r[0], r[1], r[2], r[3], '', '') for r in stored_rows]

    conn.close()

    now = datetime.now()
    safe_count = sum(1 for r in fetched if r[4] == 'Safe' or not r[4])
    defamatory_count = sum(1 for r in fetched if r[4] == 'Defamatory')
    hate_count = sum(1 for r in fetched if r[4] == 'Hate Speech')
    report_subject = f'Filtered Report for {username}' if target_user_id else 'Report for all investigators'

    chart_activity = charts.get('weekly', '')
    chart_daily = charts.get('daily', '')
    chart_harm = charts.get('harm', '')

    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: auto; }
        .header { text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { color: #1a73e8; margin-bottom: 5px; }
        .metadata { color: #666; font-size: 12px; margin-bottom: 20px; }
        h2 { color: #1a73e8; border-left: 5px solid #1a73e8; padding-left: 10px; margin-top: 40px; }
        .evidence { border: 1px solid #eee; padding: 15px; margin: 15px 0; border-radius: 8px; background: #fafafa; page-break-inside: avoid; }
        .verified { color: #10b981; font-weight: bold; }
        .not-verified { color: #ef4444; font-weight: bold; }
        .skipped { color: #94a3b8; }
        .charts-container { display: flex; flex-wrap: wrap; justify-content: space-around; margin-top: 30px; }
        .chart-box { width: 45%; text-align: center; margin-bottom: 20px; page-break-inside: avoid; }
        .chart-img { width: 100%; border: 1px solid #ddd; border-radius: 8px; }
        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f5f5f5; border-radius: 8px; padding: 15px; text-align: center; border-left: 3px solid #1a73e8; }
        .stat-value { font-size: 24px; font-weight: 700; color: #1a73e8; }
        .stat-label { font-size: 10px; text-transform: uppercase; color: #666; margin-top: 5px; }
        .filters { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .filter-tag { background: #ddd; padding: 4px 10px; border-radius: 15px; font-size: 11px; margin-right: 8px; display: inline-block; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Forensic Evidence Report</h1>
        <p>Generated """ + now.strftime('%Y-%m-%d at %H:%M:%S') + """</p>
    </div>
    <p style="color:#666;margin-bottom:20px;">""" + report_subject + """</p>
    <div class="filters">
        <span class="filter-tag">Category: """ + category + """</span>
        <span class="filter-tag">Action: """ + action_type + """</span>
        """ + (f'<span class="filter-tag">From: {start_date}</span>' if start_date else '') + """
        """ + (f'<span class="filter-tag">To: {end_date}</span>' if end_date else '') + """
    </div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">""" + str(len(fetched)) + """</div><div class="stat-label">Scans</div></div>
        <div class="stat-card"><div class="stat-value">""" + str(len(stored)) + """</div><div class="stat-label">Stored</div></div>
        <div class="stat-card"><div class="stat-value">""" + str(defamatory_count + hate_count) + """</div><div class="stat-label">Flagged</div></div>
        <div class="stat-card"><div class="stat-value">""" + str(safe_count) + """</div><div class="stat-label">Safe</div></div>
    </div>
    """ + (f'''<h2>Forensic Analytics</h2>
    <div class="charts-container">
        {f'<div class="chart-box"><h3>7-Day Activity</h3><img class="chart-img" src="data:image/png;base64,{chart_activity}" /></div>' if chart_activity else ''}
        {f'<div class="chart-box"><h3>Daily Fetches</h3><img class="chart-img" src="data:image/png;base64,{chart_daily}" /></div>' if chart_daily else ''}
        {f'<div class="chart-box"><h3>Harm Assessment</h3><img class="chart-img" src="data:image/png;base64,{chart_harm}" /></div>' if chart_harm else ''}
    </div>''' if chart_activity or chart_daily or chart_harm else '') + """
    <h2>Captured Evidence Intelligence (""" + str(len(fetched)) + """)</h2>
    """ + ''.join([f"<div class='evidence'><p><strong>Network Post ID:</strong> {r[0]}</p><p><strong>Content:</strong> {r[1]}</p><p><strong>Author:</strong> @{r[2]}</p><p><strong>Timestamp:</strong> {r[3]}</p></div>" for r in fetched[:max_fetched]]) if fetched else '<p>No evidence found.</p>' + """
    <h2>Immutable Blockchain Anchor Log</h2>
    """ + ''.join([f"<div class='evidence'><p><strong>Evidence ID:</strong> {r[0]}</p><p><strong>TX Hash:</strong> {r[1]}</p><p><strong>Ethereum:</strong> <a href='https://sepolia.etherscan.io/tx/{r[2]}'>{r[2]}</a></p><p><strong>Saved:</strong> {r[3]}</p></div>" for r in stored[:max_stored]]) if stored else '<p>No stored records.</p>' + """
    <div class="footer">
        <p>© """ + str(now.year) + """ ChainForensix - Forensic Evidence Report</p>
    </div>
</body>
</html>"""

    try:
        pdf = generate_pdf(html)
    except Exception as e:
        return jsonify({'error': 'PDF generation failed', 'details': str(e)}), 500

    response = make_response(pdf)
    response.headers['Content-Type'] = 'application/pdf'
    filename = f"report_{username}_{now.strftime('%Y%m%d')}.pdf"
    response.headers['Content-Disposition'] = f'attachment; filename={filename}'
    return response

@app.route('/admin/user/<int:user_id>/approve', methods=['POST', 'PUT'])
@token_required
def admin_approve_user(current_user, user_id):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('UPDATE users SET account_status = ? WHERE id = ?',
              ('active', user_id))
    conn.commit()
    conn.close()
    log_audit(current_user, "user_approved", f"User ID {user_id} approved")
    return jsonify({'message': 'User approved successfully'})

@app.route('/admin/user/<int:user_id>/suspend', methods=['POST', 'PUT'])
@token_required
def admin_suspend_user(current_user, user_id):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('UPDATE users SET account_status = ? WHERE id = ?', ('suspended', user_id))
    conn.commit()
    conn.close()
    log_audit(current_user, "user_suspended", f"User ID {user_id} suspended")
    return jsonify({'message': 'User suspended successfully'})

@app.route('/admin/user/<int:user_id>/activate', methods=['POST'])
@token_required
def admin_reactivate_user(current_user, user_id):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('UPDATE users SET account_status = ? WHERE id = ?', ('active', user_id))
    conn.commit()
    conn.close()
    log_audit(current_user, "user_reactivated", f"User ID {user_id} reactivated")
    return jsonify({'message': 'User reactivated successfully'})

@app.route('/admin/user/<int:user_id>/activate', methods=['POST'])
@token_required
def admin_activate_user(current_user, user_id):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('UPDATE users SET is_active = 1 WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User activated successfully'})

@app.route('/admin/user/<int:user_id>', methods=['DELETE'])
@token_required
def admin_delete_user(current_user, user_id):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deleted successfully'})

@app.route('/admin/toggle-registration', methods=['POST'])
@token_required
def admin_toggle_reg(current_user):
    return jsonify({'message': 'Registration toggled successfully', 'enabled': True})

@app.route('/admin/workload-report', methods=['GET'])
@token_required
def admin_workload_report(current_user):
    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('''
        SELECT u.id, u.username, u.email,
               COUNT(f.id) as scan_count,
               SUM(CASE WHEN f.verified = 1 THEN 1 ELSE 0 END) as stored_count,
               SUM(CASE WHEN f.category IN ('Defamatory', 'Hate Speech') THEN 1 ELSE 0 END) as threat_count
        FROM users u
        LEFT JOIN fetched_evidence f ON u.id = f.user_id
        WHERE u.is_admin = 0
        GROUP BY u.id
        ORDER BY scan_count DESC
        LIMIT 50
    ''')
    rows = c.fetchall()
    conn.close()
    workload = [
        {'id': r[0], 'username': r[1], 'email': r[2], 'scans': r[3] or 0, 'stored': r[4] or 0, 'threats': r[5] or 0}
        for r in rows
    ]
    return jsonify({'workload': workload})

if __name__ == '__main__':
    # Create admin user on startup
    create_admin_user()
    
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')
