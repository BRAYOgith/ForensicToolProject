import re

with open('api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix for get_evidence_endpoint
old_block_1 = """        evidence_data = {
            "evidence_id": evidence_id,
            "id": on_chain_hash,
            "text": content,
            "author_username": author,
            "investigator": evidence.get('investigator', ''),
            "created_at": timestamp,
            "media_urls": evidence.get('mediaUrls', []),
            "engagement": engagement_data,
            "defamation": evidence.get('defamation', {"is_defamatory": False, "confidence": 0.0}),"""

new_block_1 = """        # Reconstruction of the defamation object for UI compatibility
        defamation_data = {
            "is_defamatory": evidence.get('category') != 'Safe',
            "category": evidence.get('category', 'Safe'),
            "confidence": evidence.get('confidence', 0.0),
            "justification": "Retrieved from blockchain record."
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
            "defamation": defamation_data,"""

# Fix for retrieve_evidence
old_block_2 = """        evidence_data = {
            "evidence_id": evidence_id,
            "id": on_chain_hash,
            "text": content,
            "author_username": author,
            "investigator": evidence.get('investigator', ''),
            "created_at": timestamp,
            "media_urls": evidence.get('mediaUrls', []),
            "engagement": engagement_data,
            "defamation": evidence.get('defamation', {"is_defamatory": False, "confidence": 0.0}),"""

new_block_2 = """        # Reconstruction for UI
        defamation_data = {
            "is_defamatory": evidence.get('category') != 'Safe',
            "category": evidence.get('category', 'Safe'),
            "confidence": evidence.get('confidence', 0.0),
            "justification": "Retrieved from blockchain record."
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
            "defamation": defamation_data,"""

# Use regex to replace to handle potential space/tab variations if needed
# But first try exact string replace
new_content = content.replace(old_block_1, new_block_1, 1)
new_content = new_content.replace(old_block_2, new_block_2, 1)

if new_content != content:
    with open('api.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated api.py")
else:
    print("Could not find matching blocks. Trying regex...")
    # fallback to a more flexible regex if needed
