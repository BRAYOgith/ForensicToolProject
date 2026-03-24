import pandas as pd

try:
    df = pd.read_csv('data/HateSpeech_Kenya.csv')
    print("Columns:", df.columns.tolist())
    print("\nClass distribution:")
    print(df['Class'].value_counts())
    
    print("\nSample Class 0 (Neither/Safe?):")
    print(df[df['Class'] == 0]['Tweet'].head(3).values)
    
    print("\nSample Class 1:")
    print(df[df['Class'] == 1]['Tweet'].head(3).values)
    
    print("\nSample Class 2:")
    print(df[df['Class'] == 2]['Tweet'].head(3).values)
    
except Exception as e:
    print(f"Error: {e}")
