import torch
from datasets import Dataset
import pandas as pd
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    Trainer, 
    TrainingArguments,
    DataCollatorWithPadding
)
import os
import numpy as np

# 1. Load Preprocessed Data
print("Loading preprocessed dataset...")
df = pd.read_csv("data/HateSpeech_Kenya_Cleaned.csv")
df = df.rename(columns={'Tweet': 'text', 'Class': 'label'})
df = df[['text', 'label']].dropna()

# 2. Setup Dataset
dataset = Dataset.from_pandas(df)
dataset = dataset.train_test_split(test_size=0.1, seed=42) # Smaller test for validation
train_ds = dataset["train"]
eval_ds = dataset["test"]

# 3. Model & Tokenizer
model_name = "Davlan/afro-xlmr-base"
print(f"Initializing {model_name}...")
tokenizer = AutoTokenizer.from_pretrained(model_name)

def tokenize_function(examples):
    return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=128)

print("Tokenizing data...")
train_ds = train_ds.map(tokenize_function, batched=True)
eval_ds = eval_ds.map(tokenize_function, batched=True)

# 4. Class Weights Definition
# Counts: 0: 36352, 1: 8543, 2: 3181
counts = np.array([36352, 8543, 3181])
weights = 1.0 / (counts / counts.min())
weights = torch.tensor(weights, dtype=torch.float)
print(f"Calculated Class Weights: {weights}")

# 5. Weighted Trainer Support
class WeightedTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.get("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        loss_fct = torch.nn.CrossEntropyLoss(weight=weights.to(model.device))
        loss = loss_fct(logits.view(-1, self.model.config.num_labels), labels.view(-1))
        return (loss, outputs) if return_outputs else loss

# 6. Model Setup
model = AutoModelForSequenceClassification.from_pretrained(
    model_name, 
    num_labels=3
)

# 7. Training Arguments
training_args = TrainingArguments(
    output_dir="afro_xlmr_retrained",
    num_train_epochs=1, # Setting to 1 for CPU feasibility, ideally 3
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_steps=100,
    weight_decay=0.01,
    logging_dir="./logs",
    eval_strategy="steps",
    eval_steps=500,
    save_strategy="steps",
    save_steps=500,
    load_best_model_at_end=True,
    report_to=[],
    learning_rate=2e-5,
)

trainer = WeightedTrainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=eval_ds,
    tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
)

print("STARTING RETRAINING (RESUMING FROM CHECKPOINT)...")
trainer.train(resume_from_checkpoint=True)

# 8. Save Model
output_path = "models/afro_xlmr_forensics"
os.makedirs(output_path, exist_ok=True)
trainer.save_model(output_path)
tokenizer.save_pretrained(output_path)

print(f"Retraining Complete. Model saved to {output_path}")
