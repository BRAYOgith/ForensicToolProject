from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import requests
import json
from store_blockchain import store_evidence, get_evidence, get_evidence_by_tx_hash
from dotenv import load_dotenv
import os
import logging
import re
import sqlite3
import jwt
import datetime
import pdfkit
from functools import wraps
from datetime import timedelta
from bcrypt import gensalt, hashpw, checkpw


logging.basicConfig(level=logging.INFO, filename='forensic.log', format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "online",
        "message": "Forensic Tool Backend is Running Successfully!",
        "service": "ForensicToolProject"
    }), 200

CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://forensic-tool-project.vercel.app"]}})

load_dotenv()
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

API_URL = "https://api-inference.huggingface.co/models/Brayo44/chainforensix_defamation_model"
HF_API_KEY = os.getenv("HF_API_KEY")
def predict_defamatory(text):
    text_lower = text.lower()
    
    safe_keywords = ['congrat', 'congrats', 'well done', 'good', 'positive', 'welcome', 'happy', 'celebrate', 'victory', 'win', 'president', 'FA', 'years', '👌']
    if any(word in text_lower for word in safe_keywords):
        logger.info("Safe keywords detected – lowering confidence")
        return {"is_defamatory": False, "confidence": 0.0}
 
    risk_keywords = [
        'madoadoa', 'inyenzi', 'cockroaches', 'fumigate', 'fumigation', 'kwekwe', 
        'conman', 'thief', 'looter', 'cartel', 'kill', 'eliminate', 'bloodsucker',
        'snake', 'devil', 'witches', 'sorcerer', 'rapist', 'murderer', 'sipangwingwi', 'tusitishwe'
    ]
    
    found_risk_words = [word for word in risk_keywords if word in text_lower]
    if found_risk_words:
        logger.info(f"High-risk/NCIC keywords detected: {found_risk_words}")
        
        return {"is_defamatory": True, "confidence": 1.0}
    
    if not HF_API_KEY:
        logger.warning("HF_API_KEY not set - skipping AI check")
        return {"is_defamatory": False, "confidence": 0.0}
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": text}
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=5)
        
        if response.status_code != 200:
            logger.error(f"HF API Error {response.status_code}: {response.text}")
            return {"is_defamatory": False, "confidence": 0.0}
        output = response.json()
        
        if isinstance(output, list) and len(output) > 0 and isinstance(output[0], list):
            scores = output[0]
        elif isinstance(output, list):
            scores = output
        else:
             return {"is_defamatory": False, "confidence": 0.0}
        
        defamatory_score = 0.0
        for item in scores:
            if item.get('label') in ['LABEL_1', 'DEFAMATORY']:
                defamatory_score = item['score']
                break
        
        confidence = float(defamatory_score)
        is_defamatory = confidence >= 0.90
        return {"is_defamatory": is_defamatory, "confidence": round(confidence, 4)}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {"is_defamatory": False, "confidence": 0.0}

bearer_token = os.getenv("X_BEARER_TOKEN")
if not bearer_token:
    logger.error("Missing X_BEARER_TOKEN in environment variables")
    raise Exception("Missing X_BEARER_TOKEN")

headers = {"Authorization": f"Bearer {bearer_token}"}

BREVO_API_KEY = os.getenv("BREVO_API_KEY")

def send_forensic_email(email, token, email_type="activation"):
    """
    Sends either an Activation or Password Reset email using Brevo.
    email_type: "activation" or "reset"
    """
    if not BREVO_API_KEY:
        logger.warning(f"BREVO_API_KEY not set — printing {email_type} link to console")
        route = "activate" if email_type == "activation" else "reset-password"
        link = f"https://forensic-tool-project.vercel.app/{route}?token={token}"
        print(f"\n=== {email_type.upper()} LINK ===\n{link}\n")
        return

    # Determine wording and route based on purpose
    if email_type == "activation":
        route = "activate"
        subject = "Activate Your Forensic Tool Account"
        title = "Welcome to ChainForensix!"
        button_text = "Activate My Account"
        instruction = "Please click the button below to activate your account."
    else:
        route = "reset-password"
        subject = "Reset Your Forensic Tool Password"
        title = "Password Reset Request"
        button_text = "Reset My Password"
        instruction = "We received a request to reset your password. Click the button below to continue."

    activation_link = f"https://forensic-tool-project.vercel.app/{route}?token={token}"

    url = "https://api.brevo.com/v3/smtp/email"
    payload = {
        "sender": {
            "name": "ChainForensix Support",
            "email": "briannjoki619@gmail.com"
        },
        "to": [{"email": email}],
        "subject": subject,
        "htmlContent": f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
                <h1 style="color: #1a73e8; font-size: 28px;">ChainForensix</h1>
                <h2 style="color: #333; margin: 30px 0;">{title}</h2>
                <p style="font-size: 18px; color: #555; line-height: 1.6;">
                    {instruction}
                </p>
                <a href="{activation_link}" 
                   style="display: inline-block; margin: 30px 0; padding: 16px 32px; background: #1a73e8; color: white; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 8px;">
                    {button_text}
                </a>
                <p style="color: #777; font-size: 14px; margin-top: 40px;">
                    This link expires in 1 hour.<br>
                    If you didn't request this, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

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
        is_active INTEGER DEFAULT 0
    )''')
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
        FOREIGN KEY (user_id) REFERENCES users(id)
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
    c.execute('PRAGMA table_info(users)')
    columns = [row[1] for row in c.fetchall()]
    if 'is_active' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 0')
    if 'email' not in columns:
        c.execute('ALTER TABLE users ADD COLUMN email TEXT')
    c.execute('PRAGMA table_info(fetched_evidence)')
    columns = [row[1] for row in c.fetchall()]
    if 'verified' not in columns:
        c.execute('ALTER TABLE fetched_evidence ADD COLUMN verified INTEGER')
    c.execute('PRAGMA table_info(stored_evidence)')
    columns = [row[1] for row in c.fetchall()]
    if 'eth_tx_hash' not in columns:
        c.execute('ALTER TABLE stored_evidence ADD COLUMN eth_tx_hash TEXT')
    conn.commit()
    conn.close()

init_db()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Token is missing or invalid'}), 401
        try:
            token = token.split(' ')[1]
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
    conn = sqlite3.connect('forensic.db'); c = conn.cursor()
    try:
        c.execute('INSERT INTO users (username, password, email, is_active) VALUES (?, ?, ?, 0)', (username, hashed, email))
        user_id = c.lastrowid
        conn.commit()
        activation_token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.datetime.utcnow() + timedelta(hours=1)
        }, app.config['SECRET_KEY'])
        
        send_forensic_email(email, activation_token, email_type="activation")
        return jsonify({'message': 'Registration successful. Check email to activate.'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/activate', methods=['GET'])
def activate():
    token = request.args.get('token')
    if not token:
        return "<h2 style='color:red;'>Invalid activation link — missing token</h2>", 400

    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = data['user_id']

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute('SELECT is_active FROM users WHERE id = ?', (user_id,))
        result = c.fetchone()

        if not result:
            conn.close()
            return "<h2 style='color:red;'>Invalid user</h2>", 400

        if result[0] == 1:
            conn.close()
            return """
            <div style="text-align:center; padding:50px; font-family:Arial;">
                <h1 style="color:green;">Account Already Activated!</h1>
                <p>You can now log in.</p>
                <a href="https://forensic-tool-project.vercel.app/login" style="color:#1a73e8;">Go to Login →</a>
            </div>
            """, 200

        c.execute('UPDATE users SET is_active = 1 WHERE id = ?', (user_id,))
        conn.commit()
        logger.info(f"User ID {user_id} activated successfully")
        conn.close()

        return """
        <div style="text-align:center; padding:50px; font-family:Arial;">
            <h1 style="color:green;">Account Activated Successfully!</h1>
            <p>You can now log in to Forensic Tool.</p>
            <a href="https://forensic-tool-project.vercel.app/login" style="color:#1a73e8; font-size:18px;">Go to Login →</a>
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
        'exp': datetime.datetime.utcnow() + timedelta(hours=1)
    }, app.config['SECRET_KEY'])

    send_activation_email(email, token)
    return jsonify({'message': 'New activation link sent! Check your inbox and spam folder.'}), 200

@app.route('/forgot-password', methods=['POST'])
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
        return jsonify({'message': 'If an account exists with this email, a reset link has been sent.'}), 200

    reset_token = jwt.encode({
        'user_id': user[0],
        'action': 'password_reset',
        'exp': datetime.datetime.utcnow() + timedelta(hours=1)
    }, app.config['SECRET_KEY'])

    send_forensic_email(email, reset_token, email_type="reset")
    return jsonify({'message': 'A password reset link has been sent to your email.'}), 200

@app.route('/reset-password', methods=['POST'])
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
        c.execute('SELECT password FROM users WHERE id = ?', (user_id,))
        old_password_hash = c.fetchone()
        
        if not old_password_hash:
            conn.close()
            return jsonify({'error': 'User not found'}), 404

        if checkpw(new_password.encode('utf-8'), old_password_hash[0]):
            conn.close()
            return jsonify({'error': 'New password cannot be the same as your old password.'}), 400

        hashed = hashpw(new_password.encode('utf-8'), gensalt())
        c.execute('UPDATE users SET password = ? WHERE id = ?', (hashed, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Password reset successful. You can now log in.'}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Reset link expired'}), 400
    except Exception as e:
        return jsonify({'error': 'Invalid reset link'}), 400
        
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT id, password, is_active FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401

    if not checkpw(password.encode('utf-8'), user[1]):
        return jsonify({'error': 'Invalid username or password'}), 401

    if user[2] == 0:
        return jsonify({'error': 'Account not activated. Please check your email for activation link.'}), 403

    token = jwt.encode({
        'user_id': user[0],
        'exp': datetime.datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'])

    return jsonify({'token': token, 'user_id': user[0]}), 200

@app.route('/search-x-posts', methods=['POST'])
@token_required
@limiter.limit("20 per hour")
def search_x_posts(current_user):
    data = request.get_json()
    query = data.get('query')
    if not query:
        return jsonify({"error": "Search query is required"}), 400

    # Force query to be quoted as exact phrase to avoid & and other char parsing issues
    safe_query = f'"{query}"' if not (query.startswith('"') and query.endswith('"')) else query

    search_url = (
        f"https://api.x.com/2/tweets/search/recent?"
        f"query={requests.utils.quote(safe_query)}"
        f"&tweet.fields=created_at,author_id,text,conversation_id,entities"
        f"&expansions=author_id"
        f"&user.fields=username"
        f"&max_results=10"
    )

    response = requests.get(search_url, headers=headers)
    if response.status_code != 200:
        logger.error(f"X search failed: {response.status_code} - {response.text}")
        return jsonify({"error": "X search failed", "details": response.text}), response.status_code

    results = response.json()
    posts = []
    if 'data' in results:
        users = {u['id']: u['username'] for u in results.get('includes', {}).get('users', [])}
        for tweet in results['data']:
            posts.append({
                "post_id": tweet['id'],
                "text": tweet.get('text', ''),  # Full text when available
                "author_username": users.get(tweet['author_id'], 'unknown'),
                "created_at": tweet['created_at']
            })

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
            f"&tweet.fields=created_at,conversation_id,text,entities,attachments"
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

        defamation_result = predict_defamatory(expanded_text)
        logger.info(f"Defamation scan for post {post_id}: {defamation_result}")

        post_data = {
            "id": post_id,
            "text": expanded_text,  # Full expanded text
            "author_username": author_username,
            "created_at": created_at,
            "author_id": author_id,
            "media_urls": media_urls,
            "defamation": defamation_result
        }

        # Store fetch in DB (your existing code)
        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO fetched_evidence (user_id, post_id, content, author_username, created_at, media_urls, timestamp, verified) '
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (current_user, post_id, expanded_text, author_username, created_at, json.dumps(media_urls), datetime.datetime.now().isoformat(), None)
        )
        conn.commit()
        conn.close()

        return jsonify(post_data), 200
    except Exception as e:
        logger.error(f"Error in fetch_x_post: {str(e)}")
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

        evidence_for_blockchain = {
            "hash": evidence_data.get("id", ""),
            "timestamp": evidence_data.get("created_at", datetime.datetime.now().isoformat()),
            "investigator": str(current_user),
            "content": evidence_data.get("content", ""),
            "author_username": evidence_data.get("author_username", ""),
            "mediaUrls": evidence_data.get("media_urls", []),
            "defamation": defamation
        }
        logger.info(f"Sending to blockchain: {evidence_for_blockchain}")

        result = store_evidence(json.dumps(evidence_for_blockchain))
        if not result or result.get('evidence_id') == -1:
            logger.error(f"Failed to store evidence: {result}")
            return jsonify({"error": "Failed to store evidence on blockchain"}), 500

        tx_hash = result['tx_hash']
        eth_tx_hash = result['eth_tx_hash']
        evidence_id = result['evidence_id']

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO stored_evidence (user_id, evidence_id, tx_hash, eth_tx_hash, timestamp) VALUES (?, ?, ?, ?, ?)',
            (current_user, str(evidence_id), tx_hash, eth_tx_hash, datetime.datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        return jsonify({
            "evidence_id": evidence_id,
            "tx_hash": tx_hash,
            "eth_tx_hash": eth_tx_hash
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

        evidence_data = {
            "id": evidence.get('hash', ''),
            "text": evidence.get('content', ''),
            "author_username": evidence.get('author_username', ''),
            "investigator": evidence.get('investigator', ''),
            "created_at": evidence.get('timestamp', ''),
            "media_urls": evidence.get('mediaUrls', []),
            "defamation": evidence.get('defamation', {"is_defamatory": False, "confidence": 0.0})
        }

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO requests_log (user_id, request_type, timestamp) VALUES (?, ?, ?)',
            (current_user, 'retrieval', datetime.datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

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

        evidence = get_evidence_by_tx_hash(normalized_tx_hash)
        if not evidence:
            return jsonify({"error": "Evidence not found for transaction hash"}), 404

        evidence_data = {
            "evidence_id": evidence.get('evidence_id', ''),
            "id": evidence.get('hash', ''),
            "text": evidence.get('content', ''),
            "author_username": evidence.get('author_username', ''),
            "investigator": evidence.get('investigator', ''),
            "created_at": evidence.get('timestamp', ''),
            "media_urls": evidence.get('mediaUrls', []),
            "defamation": evidence.get('defamation', {"is_defamatory": False, "confidence": 0.0})
        }

        conn = sqlite3.connect('forensic.db')
        c = conn.cursor()
        c.execute(
            'INSERT INTO requests_log (user_id, request_type, timestamp) VALUES (?, ?, ?)',
            (current_user, 'retrieval', datetime.datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

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
    if str(current_user) != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    username = c.fetchone()[0]

    c.execute('SELECT id, post_id, content, author_username, created_at, media_urls, timestamp, verified FROM fetched_evidence WHERE user_id = ?', (user_id,))
    fetched = [{
        'id': r[0],
        'post_id': r[1],
        'content': r[2],
        'author_username': r[3],
        'created_at': r[4],
        'media_urls': json.loads(r[5]),
        'timestamp': r[6],
        'verified': r[7]
    } for r in c.fetchall()]

    c.execute('SELECT id, evidence_id, tx_hash, eth_tx_hash, timestamp FROM stored_evidence WHERE user_id = ?', (user_id,))
    stored = [{
        'id': r[0],
        'evidence_id': r[1],
        'tx_hash': r[2],
        'eth_tx_hash': r[3],
        'timestamp': r[4]
    } for r in c.fetchall()]

    conn.close()

    return jsonify({'username': username, 'fetched': fetched, 'stored': stored})

@app.route('/report-stats/<user_id>', methods=['GET'])
@token_required
def report_stats(current_user, user_id):
    if str(current_user) != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()

    now = datetime.datetime.now()
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start - timedelta(seconds=1)

    def count(request_type, start, end=None):
        if end:
            c.execute(
                'SELECT COUNT(*) FROM requests_log WHERE user_id = ? AND request_type = ? AND timestamp >= ? AND timestamp < ?',
                (user_id, request_type, start.isoformat(), end.isoformat())
            )
        else:
            c.execute(
                'SELECT COUNT(*) FROM requests_log WHERE user_id = ? AND request_type = ? AND timestamp >= ?',
                (user_id, request_type, start.isoformat())
            )
        return c.fetchone()[0]

    weekly_fetches = count('fetch', week_ago)
    weekly_retrievals = count('retrieval', week_ago)
    yesterday_fetches = count('fetch', yesterday_start, yesterday_end)
    yesterday_retrievals = count('retrieval', yesterday_start, yesterday_end)
    today_fetches = count('fetch', today_start)
    today_retrievals = count('retrieval', today_start)

    conn.close()

    return jsonify({
        'weekly': {'fetches': weekly_fetches, 'retrievals': weekly_retrievals},
        'daily': {
            'yesterday': {'fetches': yesterday_fetches, 'retrievals': yesterday_retrievals},
            'today': {'fetches': today_fetches, 'retrievals': today_retrievals}
        }
    })

@app.route('/generate-report/<user_id>', methods=['GET'])
@token_required
def generate_report(current_user, user_id):
    if str(current_user) != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    conn = sqlite3.connect('forensic.db')
    c = conn.cursor()
    c.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    username = c.fetchone()[0]

    c.execute('SELECT post_id, content, author_username, created_at, media_urls, timestamp, verified FROM fetched_evidence WHERE user_id = ?', (user_id,))
    fetched = c.fetchall()

    c.execute('SELECT evidence_id, tx_hash, eth_tx_hash, timestamp FROM stored_evidence WHERE user_id = ?', (user_id,))
    stored = c.fetchall()

    conn.close()

    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            h1 {{ color: #1a73e8; }}
            .evidence {{ border: 1px solid #ddd; padding: 10px; margin: 10px 0; }}
            .verified {{ color: green; }}
            .not-verified {{ color: red; }}
            .skipped {{ color: gray; }}
        </style>
    </head>
    <body>
        <h1>Forensic Report - {username}</h1>
        <h2>Fetched Evidence</h2>
        {''.join([
            f"<div class='evidence'><p><strong>Post ID:</strong> {r[0]}</p>"
            f"<p><strong>Content:</strong> {r[1]}</p>"
            f"<p><strong>Author:</strong> {r[2]}</p>"
            f"<p><strong>Created:</strong> {r[3]}</p>"
            f"<p><strong>Fetched:</strong> {r[5]}</p>"
            f"<p><strong>Status:</strong> "
            f"<span class='{ 'verified' if r[6]==1 else 'not-verified' if r[6]==0 else 'skipped' }'>"
            f"{ 'Verified' if r[6]==1 else 'Not Verified' if r[6]==0 else 'Skipped' }</span></p>"
            "</div>"
            for r in fetched
        ])}
        <h2>Stored Evidence</h2>
        {''.join([
            f"<div class='evidence'><p><strong>Evidence ID:</strong> {r[0]}</p>"
            f"<p><strong>Contract Tx Hash:</strong> {r[1]}</p>"
            f"<p><strong>Ethereum Tx Hash:</strong> {r[2]}</p>"
            f"<p><strong>Stored:</strong> {r[3]}</p></div>"
            for r in stored
        ])}
    </body>
    </html>
    """

    pdf = pdfkit.from_string(html_content, False)
    response = make_response(pdf)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=forensic_report_{user_id}.pdf'
    return response

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
