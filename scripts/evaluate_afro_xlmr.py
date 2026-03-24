import torch
import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

def evaluate_model(model_path, data_path):
    print(f"Loading model and tokenizer from {model_path}...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    model.eval()

    print(f"Loading cleaning data from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Use a random sample for balanced evaluation
    test_df = df.sample(n=min(1000, len(df)), random_state=42)
    
    texts = test_df['Tweet'].tolist()
    labels = test_df['Class'].tolist() # 0: Safe, 1: Defamatory, 2: Hate Speech
    
    preds = []
    print("Running Inference on test set...")
    with torch.no_grad():
        for i, text in enumerate(texts):
            if i % 100 == 0: print(f"Processed {i}/1000...")
            inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
            outputs = model(**inputs)
            pred = torch.argmax(outputs.logits, dim=1).item()
            preds.append(pred)

    print("\n--- FINAL EVALUATION REPORT ---")
    target_names = ['Safe', 'Defamatory', 'Hate Speech']
    print(classification_report(labels, preds, target_names=target_names))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(labels, preds))

if __name__ == "__main__":
    evaluate_model(
        'models/afro_xlmr_forensics',
        'data/HateSpeech_Kenya_Cleaned.csv'
    )
