from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from store_blockchain import store_evidence
import json
import logging
import time
import random

# Configure Flask app and CORS
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Allow frontend

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")
if not X_BEARER_TOKEN:
    logger.error("X_BEARER_TOKEN not set in .env")
    raise Exception("X_BEARER_TOKEN not set")

# X API headers
headers = {
    "Authorization": f"Bearer {X_BEARER_TOKEN}",
    "Content-Type": "application/json"
}

def make_x_request(url, headers, retries=3, backoff_factor=1):
    """Make X API request with retry on 429 errors."""
    for attempt in range(retries):
        response = requests.get(url, headers=headers)
        # Log rate limit headers
        rate_headers = {
            "X-RateLimit-Limit": response.headers.get("X-RateLimit-Limit"),
            "X-RateLimit-Remaining": response.headers.get("X-RateLimit-Remaining"),
            "X-RateLimit-Reset": response.headers.get("X-RateLimit-Reset"),
            "Retry-After": response.headers.get("Retry-After")
        }
        logger.info(f"Rate limit headers: {rate_headers}")

        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            wait_time = int(retry_after) if retry_after and retry_after.isdigit() else (2 ** attempt) * backoff_factor
            wait_time += random.uniform(0, 0.1)  # Jitter
            logger.warning(f"429 Too Many Requests. Waiting {wait_time}s (attempt {attempt+1}/{retries})")
            time.sleep(wait_time)
            continue
        return response
    return response  # Return last response if retries exhausted

@app.route('/fetch-x-post', methods=['POST'])
def fetch_x_post():
    try:
        data = request.get_json()
        post_id = data.get('post_id')
        input_text = data.get('text', '')

        if not post_id:
            logger.error("No post_id provided")
            return jsonify({"error": "post_id is required"}), 400

        # Fetch post from X API with retry
        url = f"https://api.x.com/2/tweets/{post_id}?tweet.fields=created_at,author_id"
        response = make_x_request(url, headers)
        if response.status_code != 200:
            logger.error(f"X API error: {response.text}")
            return jsonify({"error": f"Failed to fetch post from X: {response.text}"}), response.status_code
        post_data = response.json().get('data')
        if not post_data:
            logger.error("No post data returned")
            return jsonify({"error": "Post not found"}), 404

        # Get author username
        author_id = post_data['author_id']
        user_url = f"https://api.x.com/2/users/{author_id}?user.fields=username"
        user_response = make_x_request(user_url, headers)
        if user_response.status_code != 200:
            logger.error(f"User API error: {user_response.text}")
            return jsonify({"error": f"Failed to fetch user data: {user_response.text}"}), user_response.status_code
        username = user_response.json()['data']['username']

        # Prepare post data
        post = {
            "id": post_data['id'],
            "text": post_data['text'],
            "created_at": post_data['created_at'],
            "author_id": post_data['author_id'],
            "author_username": username
        }

        # Verify input text if provided
        verified = input_text.strip() == post_data['text'].strip() if input_text else None

        logger.info(f"Fetched post {post_id} successfully")
        return jsonify({
            "post": post,
            "verified": verified
        })

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/store-evidence', methods=['POST'])
def store_evidence_endpoint():
    try:
        data = request.get_json()
        evidence = data.get('evidence')
        if not evidence:
            logger.error("No evidence provided")
            return jsonify({"error": "Evidence is required"}), 400

        # Validate evidence JSON structure
        try:
            evidence_json = json.loads(evidence)
            required_keys = ["id", "text", "author_username"]
            if not all(key in evidence_json for key in required_keys):
                logger.error("Missing required fields in evidence JSON")
                return jsonify({"error": "Evidence must contain id, text, and author_username"}), 400
        except json.JSONDecodeError:
            logger.error("Invalid JSON format for evidence")
            return jsonify({"error": "Invalid JSON format for evidence"}), 400

        result = store_evidence(evidence)
        if result:
            logger.info(f"Stored evidence with tx hash: {result['receipt'].transactionHash.hex()}")
            return jsonify({
                "transactionHash": result['receipt'].transactionHash.hex(),
                "evidenceId": result['evidence_id']
            })
        else:
            logger.error("Failed to store evidence")
            return jsonify({"error": "Failed to store evidence"}), 500

    except Exception as e:
        logger.error(f"Error storing evidence: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get-evidence', methods=['GET'])
def get_evidence():
    try:
        evidence_id = request.args.get('id', type=int)
        if evidence_id is None:
            logger.error("No evidence ID provided")
            return jsonify({"error": "Evidence ID is required"}), 400

        from store_blockchain import get_evidence
        evidence = get_evidence(evidence_id)
        if evidence:
            logger.info(f"Retrieved evidence ID {evidence_id}")
            return jsonify({"id": evidence_id, "data": evidence})
        else:
            logger.error(f"Evidence ID {evidence_id} not found")
            return jsonify({"error": "Evidence not found"}), 404

    except Exception as e:
        logger.error(f"Error retrieving evidence: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)