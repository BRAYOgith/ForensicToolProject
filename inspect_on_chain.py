import store_blockchain
import json

def inspect_on_chain(evidence_id):
    if not store_blockchain.init_blockchain():
        return
    
    print(f"Fetching Evidence ID: {evidence_id}")
    evidence = store_blockchain.get_evidence(evidence_id)
    if not evidence:
        print("Evidence not found.")
        return
    
    print("\n--- ON-CHAIN DATA (ID 4) ---")
    print(f"Raw Keys: {evidence.keys()}")
    print(f"Investigator: '{evidence.get('investigator')}' (Type: {type(evidence.get('investigator'))})")
    print(f"Category: {evidence.get('category')}")
    print(f"Confidence: {evidence.get('confidence')}")
    print(f"Engagement: {evidence.get('engagement')}")
    print(f"Media URLs: {evidence.get('mediaUrls')}")

if __name__ == "__main__":
    inspect_on_chain(4)
