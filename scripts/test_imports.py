import sys
print("Starting import...", flush=True)
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    print("Transformers imported!", flush=True)
except Exception as e:
    print(f"Error: {e}")
