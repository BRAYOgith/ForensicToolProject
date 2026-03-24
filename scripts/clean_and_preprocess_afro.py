import pandas as pd
import re
import emoji
import random

# NCIC Lexicon (Prohibited terms as per NCIC Act 2008)
NCIC_LEXICON = [
    "Hatupangwingwi", "Mende", "Chunga Kura", "Kama noma noma", 
    "Kwekwe", "Madoa doa", "Operation Linda Kura", "Watu wa kurusha mawe", 
    "Watajua hawajui", "Wabara waende kwao", "Wakuja", "Fumigation"
]

# Strategic Emoji List for toxic context (to be injected during augmentation)
TOXIC_EMOJIS = ["", "", "", "", "", "", "", "", ""] # Add more as needed

def clean_text(text):
    # Convert list-like strings to pure strings
    if text.startswith("[") and text.endswith("]"):
        try:
            text = eval(text)[0]
        except:
            pass
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    
    # Standardize handles (USERNAME_1 -> @user)
    text = re.sub(r'USERNAME_\d+', '@user', text)
    
    # Convert real emojis to text (Universal Support)
    text = emoji.demojize(text) # e.g.  -> :face_with_tears_of_joy:
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def augment_with_emojis(text, label):
    # Only inject into toxic classes (1 and 2) to teach associations
    if label > 0 and random.random() < 0.2: # 20% chance
        selected_emoji = random.choice(TOXIC_EMOJIS)
        # Convert to text description immediately to match cleaning pipeline
        emoji_text = emoji.demojize(selected_emoji)
        return f"{text} {emoji_text}"
    return text

def preprocess_dataset(input_path, output_path):
    print(f"Loading dataset from {input_path}...")
    df = pd.read_csv(input_path)
    
    print("Cleaning and Transcribing Emojis...")
    df['Tweet'] = df['Tweet'].astype(str).apply(clean_text)
    
    print("Performing Data Augmentation (Emoji Bridge)...")
    df['Tweet'] = df.apply(lambda x: augment_with_emojis(x['Tweet'], x['Class']), axis=1)
    
    # Mapping clarification:
    # 0 -> 0 (Neither)
    # 1 -> 1 (Defamatory)
    # 2 -> 2 (Hate Speech)
    # The dataset already uses these, but let me ensure they are valid
    df = df[df['Class'].isin([0, 1, 2])]
    
    print(f"Saving cleaned dataset to {output_path}...")
    df.to_csv(output_path, index=False)
    print("Preprocessing Complete.")

if __name__ == "__main__":
    preprocess_dataset(
        'c:/Projects/ForensicToolProject/data/HateSpeech_Kenya.csv',
        'c:/Projects/ForensicToolProject/data/HateSpeech_Kenya_Cleaned.csv'
    )
