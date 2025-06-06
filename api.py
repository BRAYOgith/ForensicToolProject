from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
from store_blockchain import store_evidence, get_evidence
import json
import logging
import time
import random
from datetime import datetime

# Configure Flask app and CORS
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

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

def make_x_request(url, headers, params=None, retries=3, backoff_factor=2):
    """Make X API request with retry on 429 errors."""
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, params=params)
            # Log rate limit headers
            rate_headers = {
                "x-rate-limit-limit": response.headers.get("x-rate-limit-limit"),
                "x-rate-limit-remaining": response.headers.get("x-rate-limit-remaining"),
                "x-rate-limit-reset": response.headers.get("x-rate-limit-reset"),
                "retry-after": response.headers.get("retry-after")
            }
            logger.info(f"Rate limit headers for {url}: {rate_headers}")

            if response.status_code == 429:
                reset_time = response.headers.get("x-rate-limit-reset")
                wait_time = int(response.headers.get("retry-after", 0)) or (2 ** attempt) * backoff_factor
                if reset_time:
                    reset_dt = datetime.fromtimestamp(int(reset_time))
                    logger.warning(f"Rate limit reset at {reset_dt}")
                logger.warning(f"429 Too Many Requests. Waiting {wait_time}s (attempt {attempt+1}/{retries})")
                time.sleep(wait_time + random.uniform(0, 0.1))
                continue
            response.raise_for_status()
            return response
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error: {str(e)}")
            if attempt == retries - 1:
                raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {str(e)}")
            if attempt == retries - 1:
                raise
    raise Exception("Max retries exceeded")

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
        url = f"https://api.x.com/2/tweets/{post_id}"
        params = {
            "tweet.fields": "id,text,author_id,created_at",
            "expansions": "author_id",
            "user.fields": "username"
        }
        logger.info(f"Attempting to fetch post_id {post_id}")
        response = make_x_request(url, headers, params)
        response_data = response.json()
        
        if not response_data.get('data'):
            error_detail = response_data.get('errors', [{}])[0].get('detail', 'No details provided')
            logger.error(f"No post data returned for post_id {post_id}: {response_data}")
            return jsonify({"error": f"Post not found or inaccessible: {error_detail}. Please verify the post ID is valid and public (e.g., from @NASA or @elonmusk)."}), 404

        post_data = response_data['data']
        # Get author username from expansions
        users = response_data.get('includes', {}).get('users', [])
        username = next((user['username'] for user in users if user['id'] == post_data['author_id']), "unknown")

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

        logger.info(f"Fetched post {post_id} successfully: {post}")
        return jsonify({
            "post": post,
            "verified": verified
        })

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        error_msg = e.response.text
        logger.error(f"X API error for post_id {post_id}: {status_code} - {error_msg}")
        if status_code == 401:
            return jsonify({"error": "Authentication failed: Invalid or expired Bearer Token. Please verify X_BEARER_TOKEN in .env and ensure it has read permissions."}), 401
        if status_code == 429:
            reset_time = e.response.headers.get("x-rate-limit-reset", "unknown")
            return jsonify({"error": f"Rate limit exceeded. Try again after reset time: {reset_time}"}), 429
        return jsonify({"error": f"Failed to fetch post: {error_msg}"}), status_code
    except Exception as e:
        logger.error(f"Unexpected error for post_id {post_id}: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

# Existing /store-evidence and /get-evidence endpoints (unchanged)
@app.route('/store-evidence', methods=['POST'])
def store_evidence_endpoint():
    try:
        data = request.get_json()
        evidence = data.get('evidence')
        if not evidence:
            logger.error("No evidence provided")
            return jsonify({"error": "Evidence is required"}), 400

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