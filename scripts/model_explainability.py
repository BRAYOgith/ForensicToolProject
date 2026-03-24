import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F

def explain_prediction(text, model_path="models/afro_xlmr_forensics"):
    print(f" EXPLAINING PREDICTION: '{text}'")
    print("="*50)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path).to(device)
    model.eval()

    # Tokenize
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128).to(device)
    tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
    
    # Original Prediction
    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1).cpu().numpy()[0]
        base_scores = probs
    
    label_names = ["Safe", "Defamatory", "Hate Speech"]
    pred_label = np.argmax(base_scores)
    print(f"Predicted Class: {label_names[pred_label]} ({base_scores[pred_label]:.2%})")
    
    # Simple Leave-One-Out (Occlusion) Importance
    # This addresses Transparency by showing why the model flagged certain text
    importances = []
    
    for i in range(1, len(tokens)-1): # Skip [CLS] and [SEP]
        occluded_ids = inputs['input_ids'].clone()
        occluded_ids[0][i] = tokenizer.pad_token_id
        
        with torch.no_grad():
            outputs = model(input_ids=occluded_ids, attention_mask=inputs['attention_mask'])
            new_probs = F.softmax(outputs.logits, dim=-1).cpu().numpy()[0]
            # Change in probability of the predicted label
            importance = base_scores[pred_label] - new_probs[pred_label]
            importances.append((tokens[i], importance))

    print("\n Key Feature Influences (Why this was flagged):")
    # Sort by importance
    importances.sort(key=lambda x: x[1], reverse=True)
    for token, score in importances[:5]:
        status = "REDUCED confidence" if score > 0 else "INCREASED confidence"
        print(f" - Word '{token}': Removing it {status} by {abs(score):.2%}")

if __name__ == "__main__":
    # Example usage:
    sample_text = "Some representative text here to test the explainability module."
    explain_prediction(sample_text)
