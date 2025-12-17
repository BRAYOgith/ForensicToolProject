import pandas as pd
train_df = pd.read_csv('C:/Projects/ForensicToolProject/data/train.csv')
val_df = pd.read_csv('C:/Projects/ForensicToolProject/data/val.csv')
print("Train columns:", train_df.columns.tolist())
print("Train sample:\n", train_df.head())
print("Val columns:", val_df.columns.tolist())
print("Val sample:\n", val_df.head())