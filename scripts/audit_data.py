import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os

def audit_dataset(file_path):
    print(f" AUDITING DATASET: {file_path}")
    print("="*50)
    
    if not os.path.exists(file_path):
        print(f"ERROR: Error: {file_path} not found.")
        return

    df = pd.read_csv(file_path)
    
    # 1. Basic Stats
    print(f"Total Rows: {len(df)}")
    
    # 2. Label Distribution (Diversity Check)
    label_col = 'label_id' if 'label_id' in df.columns else 'Class'
    if label_col in df.columns:
        counts = df[label_col].value_counts()
        print("\n Label Distribution (Class Balance):")
        for label, count in counts.items():
            percentage = (count / len(df)) * 100
            label_name = {0: "Safe", 1: "Defamatory", 2: "Hate Speech"}.get(label, f"Unknown ({label})")
            print(f" - {label_name}: {count} ({percentage:.2f}%)")
    
    # 3. Data Quality: Text Length Audit
    text_col = 'Tweet' if 'Tweet' in df.columns else 'text'
    if text_col in df.columns:
        df['length'] = df[text_col].astype(str).str.len()
        print(f"\n Text Length Stats:")
        print(f" - Average: {df['length'].mean():.2f} chars")
        print(f" - Shortest: {df['length'].min()} chars")
        print(f" - Longest: {df['length'].max()} chars")

        # Check for empty/null text
        nulls = df[text_col].isna().sum()
        if nulls > 0:
            print(f"WARNING: Warning: Found {nulls} null text entries.")

    # 4. Bias Detection: Tribal Identifier Check (Simple Heuristic)
    # Checking if certain group names are only associated with toxic labels
    tribes = ['kikuyu', 'kalenjin', 'luo', 'luhya', 'kamba', 'somali']
    print("\n Bias Audit (Tribal Groups Representation):")
    for tribe in tribes:
        pattern = df[text_col].str.contains(tribe, case=False, na=False)
        tribe_count = pattern.sum()
        if tribe_count > 0:
            tribe_df = df[pattern]
            toxic_rate = (tribe_df[label_col] != 0).mean() * 100
            print(f" - '{tribe}': mentioned in {tribe_count} rows. {toxic_rate:.1f}% are flagged as Toxic.")
        else:
            print(f" - '{tribe}': Not found in dataset.")

    print("\nSUCCESS: Audit Complete.")

if __name__ == "__main__":
    audit_dataset('data/Kenya_Hate_Final.csv')
