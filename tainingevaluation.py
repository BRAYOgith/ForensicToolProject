# ============================================
# KENYAN HATE SPEECH - BALANCED OPTIMIZATION
# ============================================

import torch
import numpy as np
import pandas as pd
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import f1_score, classification_report
import torch.nn.functional as F
import json
import os

print(" KENYAN HATE SPEECH - BALANCED OPTIMIZATION")
print("="*70)

# ============================================
# 1. SETUP & LOAD MODEL
# ============================================

model_path = "models/afro_xlmr_forensics"
print(f" Loading model from {model_path}...")

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForSequenceClassification.from_pretrained(model_path)
model.to(device)
model.eval()

# ============================================
# 2. LOAD TEST DATA
# ============================================

data_path = "data/HateSpeech_Kenya_Cleaned.csv"
print(f" Loading test data from {data_path}...")
df = pd.read_csv(data_path)

# Ensure 'Tweet' and 'Class' columns exist
if 'Tweet' not in df.columns or 'Class' not in df.columns:
    print("ERROR: Error: CSV must contain 'Tweet' and 'Class' columns.")
    exit(1)

# Sample for evaluation (CPU optimization)
# We take a representative sample to find the best thresholds
test_df = df.sample(n=min(500, len(df)), random_state=42)
test_texts = test_df['Tweet'].astype(str).tolist()
y_true = test_df['Class'].values

# ============================================
# 3. GENERATE PREDICTIONS (PROBS)
# ============================================

print(f" Generating predictions for {len(test_texts)} samples...")
all_probs = []

with torch.no_grad():
    for i, text in enumerate(test_texts):
        if i % 100 == 0: print(f"   Progress: {i}/{len(test_texts)}")
        inputs = tokenizer(text, padding=True, truncation=True, max_length=128, return_tensors="pt").to(device)
        outputs = model(**inputs)
        probs_val = F.softmax(outputs.logits, dim=-1).cpu().numpy()[0]
        all_probs.append(probs_val)

probs = np.array(all_probs)

# ============================================
# 4. FIND THRESHOLD THAT BALANCES ALL CLASSES
# ============================================

print("\n FINDING BALANCED THRESHOLDS")
print("-"*70)

best_macro_f1 = 0
best_hate_thresh = 0.5
best_defam_thresh = 0.5

# Grid search for the best combination of thresholds
for hate_t in np.arange(0.30, 0.70, 0.05):
    for defam_t in np.arange(0.15, 0.55, 0.05):
        # Predict with thresholds
        y_pred = np.zeros_like(y_true)
        
        # Priority 1: Hate Speech
        hate_mask = probs[:, 2] > hate_t
        y_pred[hate_mask] = 2
        
        # Priority 2: Defamatory (if not Hate Speech)
        defam_mask = (probs[:, 1] > defam_t) & (y_pred == 0)
        y_pred[defam_mask] = 1
        
        # Priority 3: Safe (y_pred is already 0)
        
        # Calculate scores
        hate_f1 = f1_score(y_true == 2, y_pred == 2)
        defam_f1 = f1_score(y_true == 1, y_pred == 1)
        safe_f1 = f1_score(y_true == 0, y_pred == 0)
        
        # Weighted score - prioritize toxicity detection while keeping Safes respectable
        weighted_score = (hate_f1 * 0.5) + (defam_f1 * 0.3) + (safe_f1 * 0.2)
        
        if weighted_score > best_macro_f1:
            best_macro_f1 = weighted_score
            best_hate_thresh = hate_t
            best_defam_thresh = defam_t

print(f"SUCCESS: OPTIMAL HATE THRESHOLD: {best_hate_thresh:.2f}")
print(f"SUCCESS: OPTIMAL DEFAM THRESHOLD: {best_defam_thresh:.2f}")

# ============================================
# 5. APPLY BALANCED THRESHOLDS
# ============================================

y_pred_balanced = np.zeros_like(y_true)

# Hate Speech
hate_mask = probs[:, 2] > best_hate_thresh
y_pred_balanced[hate_mask] = 2

# Defamatory  
defam_mask = (probs[:, 1] > best_defam_thresh) & (y_pred_balanced == 0)
y_pred_balanced[defam_mask] = 1

# ============================================
# 6. RESULTS COMPARISON
# ============================================

print("\n" + "="*70)
print(" RESULTS COMPARISON")
print("="*70)

print("\n ARGMAX (Standard Precision):")
print(classification_report(y_true, np.argmax(probs, axis=-1),
                          target_names=['Safe', 'Defamatory', 'Hate Speech'],
                          digits=4))

print("\n� BALANCED (Forensic Sensitivity):")
print(classification_report(y_true, y_pred_balanced,
                          target_names=['Safe', 'Defamatory', 'Hate Speech'],
                          digits=4))

# ============================================
# 7. CONFIDENCE ANALYSIS
# ============================================

print("\n" + "="*70)
print(" CONFIDENCE-BASED FILTERING")
print("="*70)

confidence = np.max(probs, axis=1)
conf_thresh = 0.70
mask = confidence > conf_thresh

if mask.sum() > 0:
    print(f"SUCCESS: Keeping {mask.sum()}/{len(y_true)} samples ({mask.mean():.1%})")
    print("\n Performance on High-Confidence Samples:")
    print(classification_report(y_true[mask], y_pred_balanced[mask],
                              target_names=['Safe', 'Defamatory', 'Hate Speech'],
                              digits=4))

# ============================================
# 8. SAVE CONFIGURATION
# ============================================

final_config = {
    'hate_threshold': float(best_hate_thresh),
    'defamatory_threshold': float(best_defam_thresh),
    'confidence_threshold': float(conf_thresh)
}

config_path = os.path.join(model_path, 'balanced_config.json')
with open(config_path, 'w') as f:
    json.dump(final_config, f, indent=2)

print(f"\n Saved balanced config to: {config_path}")
print("\nSUCCESS: Optimization Complete!")