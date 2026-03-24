
import pandas as pd
import re
import torch
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix

def clean_tweet(text):
    if pd.isna(text):
        return ""
    # Remove [' and '] or [" and "]
    text = re.sub(r"^\[(['\"])", "", str(text))
    text = re.sub(r"(['\"])\]$", "", text)
    # Remove USERNAME_1, URLs, extra spaces
    text = re.sub(r'USERNAME_\d+', ' ', text)
    text = re.sub(r'http\S+', ' ', text)
    text = re.sub(r'@\w+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def evaluate():
    print("Loading data...")
    df = pd.read_csv("data/HateSpeech_Kenya.csv")
    
    # Apply same cleaning as training
    df['Tweet'] = df['Tweet'].apply(clean_tweet)
    
    # Apply same label mapping: 0=Safe, 1&2=Toxic
    # Class: 0 = neither, 1 = offensive, 2 = hatespeech
    df['label'] = df['Class'].apply(lambda x: 1 if x in [1, 2] else 0)
    
    df = df[['Tweet', 'label']].rename(columns={'Tweet': 'text'})
    df = df.dropna().reset_index(drop=True)
    
    # Replicate split
    dataset = Dataset.from_pandas(df)
    dataset = dataset.train_test_split(test_size=0.2, seed=42)
    eval_dataset = dataset["test"]

    # Subset for faster evaluation
    SUBSET_SIZE = 1000
    if len(eval_dataset) > SUBSET_SIZE:
        eval_dataset = eval_dataset.shuffle(seed=42).select(range(SUBSET_SIZE))
    
    print(f"Eval dataset size (subset): {len(eval_dataset)}")
    
    # Load model
    MODEL_PATH = "chainforensix_defamation_model"
    print(f"Loading model from {MODEL_PATH}...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.eval()
    
    print("Running inference on test set...")
    
    y_true = eval_dataset["label"]
    y_pred = []
    
    # Batch processing for speed
    batch_size = 32
    texts = eval_dataset["text"]
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]
        inputs = tokenizer(batch_texts, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
        
        with torch.no_grad():
            outputs = model(**inputs)
            preds = torch.argmax(outputs.logits, dim=-1)
            y_pred.extend(preds.cpu().numpy())
            
        if i % 1000 == 0 and i > 0:
            print(f"Processed {i}/{len(texts)}")

    # Metrics
    print("\n" + "="*50)
    print("REAL EVALUATION RESULTS")
    print("="*50)
    print(f"Accuracy:  {accuracy_score(y_true, y_pred):.4f}")
    print(f"Precision: {precision_score(y_true, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_true, y_pred):.4f}")
    print(f"F1 Score:  {f1_score(y_true, y_pred):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_true, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=["Safe", "Toxic"]))

if __name__ == "__main__":
    evaluate()
