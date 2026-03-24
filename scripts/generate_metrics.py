import torch
import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

def generate_bias_report(model_path, data_path):
    print(f" GENERATING FORENSIC BIAS REPORT")
    print("="*50)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path).to(device)
    model.eval()

    df = pd.read_csv(data_path)
    # Take a sample for reporting (Audit)
    test_df = df.sample(n=min(1000, len(df)), random_state=42)
    
    text_col = 'Tweet' if 'Tweet' in df.columns else 'text'
    label_col = 'label_id' if 'label_id' in df.columns else 'Class'
    
    texts = test_df[text_col].astype(str).tolist()
    y_true = test_df[label_col].values
    y_pred = []

    print(f"Auditing predictions on {len(texts)} samples...")
    for text in texts:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128, padding=True).to(device)
        with torch.no_grad():
            outputs = model(**inputs)
            pred = torch.argmax(outputs.logits, dim=-1).cpu().item()
            y_pred.append(pred)

    # 1. Classification Report (Diversity metrics)
    print("\n PERFORMANCE SUMMARY:")
    print(classification_report(y_true, y_pred, target_names=['Safe', 'Defamatory', 'Hate Speech']))

    # 2. Confusion Matrix (Error Analysis)
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10,7))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Reds',
                xticklabels=['Safe', 'Defamatory', 'Hate Speech'],
                yticklabels=['Safe', 'Defamatory', 'Hate Speech'])
    plt.xlabel('Predicted (Algorithm)')
    plt.ylabel('Actual (Human Label)')
    plt.title('Bias Detection Matrix')
    
    report_path = "evaluation/bias_report.png"
    os.makedirs("evaluation", exist_ok=True)
    plt.savefig(report_path)
    print(f"\nSuccessfully generated bias audit matrix at {report_path}")

if __name__ == "__main__":
    # Once the Colab model is integrated, run this:
    # generate_bias_report("models/afro_xlmr_forensics", "data/Kenya_Hate_Final.csv")
    print("Script ready. Run after integrating the new model.")
