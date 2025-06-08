from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
from store_blockchain import store_evidence, get_evidence, get_evidence_id_by_tx_hash
from dotenv import load_dotenv
import os
import logging
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Load environment variables
load_dotenv()
bearer_token = os.getenv("X_BEARER_TOKEN")
if not bearer_token:
    logger.error("Missing X_BEARER_TOKEN in environment variables")
    raise Exception("Missing X_BEARER_TOKEN")

# X API headers
headers = {
    "Authorization": f"Bearer {bearer_token}"
}

# Helper function to expand URLs in text
def expand_urls(text, urls):
    if not urls:
        return text
    for url_obj in urls:
        if 'url' in url_obj and 'expanded_url' in url_obj:
            text = text.replace(url_obj['url'], url_obj['expanded_url'])
    return text

@app.route('/fetch-x-post', methods=['POST'])
def fetch_x_post():
    try:
        data = request.get_json()
        post_id = data.get('post_id')
        input_text = data.get('input_text', '')

        if not post_id:
            logger.error("No post ID provided")
            return jsonify({"error": "Post ID is required"}), 400

        # Fetch post from X API
        url = f"https://api.x.com/2/tweets/{post_id}?expansions=author_id&user.fields=username&tweet.fields=created_at,entities"
        response = requests.get(url, headers=headers)
        response_headers = response.headers

        if response.status_code != 200:
            logger.error(f"Failed to fetch post {post_id}: {response.text}")
            return jsonify({"error": f"Failed to fetch post: {response.text}"}), response.status_code

        response_data = response.json()
        logger.info(f"Fetched post {post_id} successfully: {response_data}")
        logger.info(f"Rate limit headers for {url}: {response_headers}")

        # Extract tweet data
        tweet_data = response_data.get('data', {})
        tweet_text = tweet_data.get('text', '')
        entities = tweet_data.get('entities', {})
        urls = entities.get('urls', [])
        created_at = tweet_data.get('created_at', '')
        author_id = tweet_data.get('author_id', '')

        # Expand URLs in tweet text
        expanded_text = expand_urls(tweet_text, urls)

        # Get author username
        users = response_data.get('includes', {}).get('users', [])
        author_username = next((user['username'] for user in users if user['id'] == author_id), '')

        # Prepare response
        post_data = {
            "id": post_id,
            "text": expanded_text,
            "author_username": author_username,
            "created_at": created_at,
            "author_id": author_id,
            "input_text": input_text
        }

        # Verify input_text if provided
        if input_text:
            normalized_input = re.sub(r'\s+', ' ', input_text.strip().lower())
            normalized_fetched = re.sub(r'\s+', ' ', expanded_text.strip().lower())
            if normalized_input != normalized_fetched:
                logger.warning(f"Input text does not match fetched text for post {post_id}")
                post_data["text_mismatch"] = True
            else:
                post_data["text_mismatch"] = False
                post_data["text"] = input_text  # Prioritize input text if verified

        return jsonify(post_data), 200
    except Exception as e:
        logger.error(f"Error fetching post {post_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/store-evidence', methods=['POST'])
def store_evidence_endpoint():
    try:
        data = request.get_json()
        evidence_data = data.get('evidence')
        if not evidence_data:
            logger.error("No evidence data provided")
            return jsonify({"error": "Evidence data is required"}), 400

        # Store evidence on blockchain
        result = store_evidence(evidence_data)
        if not result:
            logger.error("Failed to store evidence")
            return jsonify({"error": "Failed to store evidence"}), 500

        logger.info(f"Stored evidence with tx hash: {result['receipt']['transactionHash'].hex()}")
        return jsonify({
            "transactionHash": result['receipt']['transactionHash'].hex(),
            "evidenceId": result['evidence_id']
        }), 200
    except Exception as e:
        logger.error(f"Error storing evidence: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get-evidence', methods=['GET'])
def get_evidence_endpoint():
    try:
        evidence_id = request.args.get('id', type=int)
        if evidence_id is None:
            logger.error("No evidence ID provided")
            return jsonify({"error": "Evidence ID is required"}), 400
        evidence = get_evidence(evidence_id)
        if evidence:
            logger.info(f"Retrieved evidence ID {evidence_id}")
            return jsonify({"id": evidence_id, "data": evidence}), 200
        else:
            logger.error(f"Evidence ID {evidence_id} not found")
            return jsonify({"error": "Evidence not found"}), 404
    except Exception as e:
        logger.error(f"Error retrieving evidence: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/fetch-evidence', methods=['POST'])
def fetch_evidence():
    try:
        data = request.get_json()
        tx_hash = data.get('tx_hash')
        if not tx_hash:
            logger.error("No transaction hash provided")
            return jsonify({"error": "Transaction hash is required"}), 400

        evidence_id = get_evidence_id_by_tx_hash(tx_hash)
        logger.info(f"Fetched evidence ID {evidence_id} for tx hash {tx_hash}")
        return jsonify({"evidence_id": evidence_id}), 200
    except Exception as e:
        logger.error(f"Error fetching evidence for tx hash {tx_hash}: {str(e)}")
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)