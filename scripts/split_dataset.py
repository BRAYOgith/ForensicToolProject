import pandas as pd
from sklearn.model_selection import train_test_split
import os

def split_kenyan_data(input_path, output_dir="data/splits"):
    print(f" Starting 80-10-10 Stratified Split for: {input_path}")
    print("="*60)
    
    if not os.path.exists(input_path):
        print(f"ERROR: Error: {input_path} not found.")
        return

    # 1. Load Data
    df = pd.read_csv(input_path)
    
    # Cleaning the Kenyan-specific wrapper if present
    def clean_text(text):
        text = str(text)
        if text.startswith("['") and text.endswith("']"): text = text[2:-2]
        return text.strip()
    
    df['Tweet'] = df['Tweet'].apply(clean_text)
    label_col = 'label_id' if 'label_id' in df.columns else 'Class'
    
    print(f"Loaded {len(df)} rows.")

    # 2. Split 1: 80% Train, 20% Temporary (Val + Test)
    # Stratify ensures each split has the same % of Hate vs Safe posts
    df_train, df_temp = train_test_split(
        df, 
        test_size=0.20, 
        random_state=42, 
        stratify=df[label_col]
    )

    # 3. Split 2: Divide the 20% temp into 50/50 (which is 10/10 of the original)
    df_val, df_test = train_test_split(
        df_temp, 
        test_size=0.50, 
        random_state=42, 
        stratify=df_temp[label_col]
    )

    # 4. Save Results
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "val.csv")
    test_path = os.path.join(output_dir, "test.csv")

    df_train.to_csv(train_path, index=False)
    df_val.to_csv(val_path, index=False)
    df_test.to_csv(test_path, index=False)

    print("\nSUCCESS: DATA SPLIT COMPLETE:")
    print(f" - Training Set (80%):   {len(df_train)} rows -> Saved to {train_path}")
    print(f" - Validation Set (10%): {len(df_val)} rows -> Saved to {val_path}")
    print(f" - Test Set (10%):       {len(df_test)} rows -> Saved to {test_path}")
    print("\nDiversity Check (Hate Speech %):")
    for name, d in [("Train", df_train), ("Val", df_val), ("Test", df_test)]:
        hate_pct = (d[label_col] == 2).mean() * 100
        print(f" - {name}: {hate_pct:.2f}% Hate Speech")

if __name__ == "__main__":
    split_kenyan_data("data/Kenya_Hate_Final.csv")
