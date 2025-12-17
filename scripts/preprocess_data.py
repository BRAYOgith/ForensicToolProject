import pandas as pd
import re
from sklearn.model_selection import train_test_split
from langdetect import detect

# Load dataset
df = pd.read_csv('C:/Projects/ForensicToolProject/data/hatespeech_kenya.csv')

# Print unique values in Class for debugging
print("Unique values in Class:", df['Class'].unique())

# Clean text: remove URLs, mentions, emojis
def clean_text(text):
    text = str(text)  # Ensure text is string
    text = re.sub(r'http\S+|@\w+|#[^\s]+|[^\w\s]', '', text)
    return text.strip()

df['cleaned_text'] = df['Tweet'].apply(clean_text)

# Detect language (optional: filter Swahili/English)
df['language'] = df['cleaned_text'].apply(lambda x: detect(x) if x else 'unknown')
df = df[df['language'].isin(['sw', 'en'])]

# Map numeric Class values to binary labels: hate (0) or offensive (1) -> defamatory (1), neither (2) -> non-defamatory (0)
df['label'] = df['Class'].map({0: 1, 1: 1, 2: 0})

# Check for NaN labels
print("Number of NaN labels:", df['label'].isna().sum())
if df['label'].isna().sum() > 0:
    print("Rows with NaN labels:\n", df[df['label'].isna()][['Tweet', 'Class']])

# Drop rows with NaN labels (if any)
df = df.dropna(subset=['label'])

# Split: 80/10/10
train, temp = train_test_split(df, test_size=0.2, random_state=42)
val, test = train_test_split(temp, test_size=0.5, random_state=42)

# Save splits
train.to_csv('C:/Projects/ForensicToolProject/data/train.csv', index=False)
val.to_csv('C:/Projects/ForensicToolProject/data/val.csv', index=False)
test.to_csv('C:/Projects/ForensicToolProject/data/test.csv', index=False)

print("Preprocessing complete. Files saved: train.csv, val.csv, test.csv")
