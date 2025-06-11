from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
from store_blockchain import store_evidence, get_evidence, get_evidence_id_by_tx_hash
from dotenv import load_dotenv
import os
import logging
import re
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

load_dotenv()
bearer_token = os.getenv("X_BEARER_TOKEN")
if not bearer_token:
    logger.error("Missing X_BEARER_TOKEN in environment variables")
    raise Exception("Missing X_BEARER_TOKEN")

headers = {
    "Authorization": f"Bearer {bearer_token}"
}

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

        url = f"https://api.x.com/2/tweets/{post_id}?expansions=author_id&user.fields=username&tweet.fields=created_at,entities"
        response = requests.get(url, headers=headers)
        response_headers = response.headers

        if response.status_code != 200:
            logger.error(f"Failed to fetch post {post_id}: {response.text}")
            return jsonify({"error": f"Failed to fetch post: {response.text}"}), response.status_code

        response_data = response.json()
        logger.info(f"Fetched post {post_id} successfully: {response_data}")
        logger.info(f"Rate limit headers for {url}: {response_headers}")

        tweet_data = response_data.get('data', {})
        tweet_text = tweet_data.get('text', '')
        entities = tweet_data.get('entities', {})
        urls = entities.get('urls', [])
        created_at = tweet_data.get('created_at', '')
        author_id = tweet_data.get('author_id', '')

        expanded_text = expand_urls(tweet_text, urls)

        users = response_data.get('includes', {}).get('users', [])
        author_username = next((user['username'] for user in users if user['id'] == author_id), '')

        media_urls = [url['expanded_url'] for url in urls if 'media' in url.get('expanded_url', '').lower()]

        post_data = {
            "id": post_id,
            "text": expanded_text,
            "author_username": author_username,
            "created_at": created_at,
            "author_id": author_id,
            "media_urls": media_urls,
            "input_text": input_text
        }

        if input_text:
            normalized_input = re.sub(r'\s+', ' ', input_text.strip().lower())
            normalized_fetched = re.sub(r'\s+', ' ', expanded_text.strip().lower())
            post_data["text_mismatch"] = normalized_input != normalized_fetched
            if not post_data["text_mismatch"]:
                post_data["text"] = input_text

        return jsonify(post_data), 200
    except Exception as e:
        logger.error(f"Error fetching post {post_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/search-x-post', methods=['POST'])
def search_x_post():
    try:
        data = request.get_json()
        content = data.get('content')
        if not content:
            logger.error("No content provided for search")
            return jsonify({"error": "Content is required"}), 400

        params = {
            "query": content,
            "max_results": 10,
            "expansions": "author_id",
            "user.fields": "username",
            "tweet.fields": "created_at,entities"
        }

        for attempt in range(3):
            response = requests.get("https://api.x.com/2/tweets/search/recent", headers=headers, params=params)
            response_headers = response.headers
            if response.status_code == 200:
                break
            elif response.status_code == 503:
                logger.warning(f"Attempt {attempt + 1}: Service Unavailable, retrying in 2 seconds...")
                time.sleep(2)
            else:
                logger.error(f"Failed to search posts: {response.text}")
                return jsonify({"error": f"Failed to search posts: {response.text}"}), response.status_code

        if response.status_code != 200:
            logger.error(f"Failed to search posts after retries: {response.text}")
            return jsonify({"error": "Failed to search posts: Service Unavailable"}), 503

        response_data = response.json()
        logger.info(f"Searched posts for content: {response_data}")
        logger.info(f"Rate limit headers for search: {response_headers}")

        posts = response_data.get('data', [])
        if not posts:
            logger.warning("No matching posts found")
            return jsonify({"error": "No matching posts found"}), 404

        tweet = posts[0]
        entities = tweet.get('entities', {})
        urls = entities.get('urls', [])
        expanded_text = expand_urls(tweet['text'], urls)
        users = response_data.get('includes', {}).get('users', [])
        author = next((user for user in users if user['id'] == tweet['author_id']), {})
        media_urls = [url['expanded_url'] for url in urls if 'media' in url.get('expanded_url', '').lower()]

        return jsonify({
            "id": tweet['id'],
            "text": expanded_text,
            "author_username": author.get('username', ''),
            "created_at": tweet.get('created_at', ''),
            "author_id": tweet.get('author_id', ''),
            "media_urls": media_urls
        }), 200
    except Exception as e:
        logger.error(f"Error searching posts: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/store-evidence', methods=['POST'])
def store_evidence_endpoint():
    try:
        data = request.get_json()
        evidence_data = data.get('evidence')
        if not evidence_data:
            logger.error("No evidence data provided")
            return jsonify({"error": "Evidence data is required"}), 400

        result = store_evidence(evidence_data)
        if not result:
            logger.error("Failed to store evidence")
            return jsonify({"error": "Failed to store evidence"}), 500

        tx_hash = '0x' + result['receipt']['transactionHash'].hex()
        logger.info(f"Stored evidence with tx hash: {tx_hash}")
        return jsonify({
            "transactionHash": tx_hash,
            "evidenceId": result['evidence_id']
        }), 200
    except Exception as e:
        logger.error(f"Error storing evidence: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get-evidence', methods=['POST'])
def get_evidence_endpoint():
    try:
        data = request.get_json()
        logger.info(f"Received get-evidence request: {data}")
        evidence_id = data.get('evidence_id')
        if evidence_id is None or not str(evidence_id).isdigit():
            logger.error("Invalid or missing evidence ID")
            return jsonify({"error": "Valid evidence ID is required"}), 400

        evidence = get_evidence(int(evidence_id))
        logger.info(f"Raw evidence from blockchain for ID {evidence_id}: {evidence}")
        if not evidence:
            logger.error(f"Evidence ID {evidence_id} not found")
            return jsonify({"error": "Evidence not found"}), 404

        evidence_data = {
            "id": evidence.get('id', ''),
            "text": evidence.get('text', ''),
            "author_username": evidence.get('author_username', ''),
            "created_at": evidence.get('created_at', ''),
            "author_id": evidence.get('author_id', ''),
            "media_urls": evidence.get('media_urls', [])
        }
        response = {"id": evidence_id, "data": evidence_data}
        logger.info(f"Returning evidence response: {response}")
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Error retrieving evidence ID {evidence_id}: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to retrieve evidence: {str(e)}"}), 500

@app.route('/fetch-evidence', methods=['POST'])
def fetch_evidence():
    try:
        data = request.get_json()
        tx_hash = data.get('tx_hash')
        if not tx_hash:
            logger.error("No transaction hash provided")
            return jsonify({"error": "Transaction hash is required"}), 400

        # Normalize hash by removing '0x' if present
        if tx_hash.startswith('0x'):
            tx_hash = tx_hash[2:]
        evidence_id = get_evidence_id_by_tx_hash(tx_hash)
        logger.info(f"Fetched evidence ID {evidence_id} for tx hash: 0x{tx_hash}")
        return jsonify({"evidence_id": evidence_id}), 200
    except Exception as e:
        logger.error(f"Error fetching evidence for tx hash {tx_hash}: {str(e)}")
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)