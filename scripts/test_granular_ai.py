import re

# Mock Lexicons
NCIC_LEXICON = [
    "Hatupangwingwi", "Mende", "Chunga Kura", "Kama noma noma", 
    "Kwekwe", "Madoa doa", "Operation Linda Kura", "Watu wa kurusha mawe", 
    "Watajua hawajui", "Wabara waende kwao", "Wakuja", "Fumigation"
]

DEFAMATORY_MARKERS = [
    "thief", "corrupt", "cartel", "mafia", "scammer", "conman", "mwizi", 
    "fake", "fraud", "liar", "muongo", "character assassination", "poison",
    "jinxed", "betrayed", "failed", "stole", "corrupt"
]

SECURITY_THREATS = [
    "kill", "planning", "bomb", "attack", "al-shabaab", "terror", "violence",
    "mapinduzi", "revolution", "overthrow", "dead"
]

SAFE_SIGNIFIERS = [
    "think", "opinion", "debate", "agree", "disagree", "policy", "news",
    "discussion", "report", "fact", "together", "peace"
]

def extract_forensic_markers(text):
    text_lower = text.lower()
    found_ncic = [word for word in NCIC_LEXICON if word.lower() in text_lower]
    found_defam = [word for word in DEFAMATORY_MARKERS if word.lower() in text_lower]
    found_security = [word for word in SECURITY_THREATS if word.lower() in text_lower]
    found_safe = [word for word in SAFE_SIGNIFIERS if word.lower() in text_lower]
    
    found_entities = re.findall(r'@\w+', text)
    names = re.findall(r'\b[A-Z][a-z]+\b(?:\s+[A-Z][a-z]+\b)*', text)
    unique_names = list(set(names))
    hashtags = re.findall(r'#\w+', text)
    
    return {
        "ncic": found_ncic,
        "defamatory": found_defam,
        "security": found_security,
        "safe": found_safe,
        "entities": found_entities,
        "names": unique_names,
        "hashtags": hashtags
    }

def generate_granular_justification(cat, score, markers):
    cat_lower = cat.lower().replace(" ", "_")
    subjects = f" targeting {', '.join(markers['entities'] + markers['names'])}" if (markers['entities'] or markers['names']) else ""
    
    if cat_lower == "hate_speech":
        if score > 0.40:
            specifics = f" Critical markers found: {', '.join(markers['ncic'] + markers['security'])}." if (markers['ncic'] or markers['security']) else ""
            return f"This score indicates a high probability of ethnic incitement or prohibited speech patterns.{specifics}{subjects}"
        elif score > 0.05:
            return f"Low-level markers of inflammatory language detected, but insufficient to reach the legal threshold for hate speech."
        else:
            return f"Negligible probability. No monitored ethnic slurs or incitement patterns detected."
    
    elif cat_lower == "defamatory":
        if score > 0.35:
            specifics = f" Markers identified: {', '.join(markers['defamatory'])}." if markers['defamatory'] else ""
            return f"High probability of character assassination or reputational harm.{specifics}{subjects}"
        elif score > 0.10:
            return f"Suggestive of negative sentiment{subjects}, but lacks the definitive markers for a high-confidence defamatory flag."
        else:
            return f"Normal commentary pattern. No patterns of targeted reputational harm detected."
    
    else: # Safe
        if score > 0.50:
            signifiers = f" Semantic signifiers: {', '.join(markers['safe'])}." if markers['safe'] else ""
            return f"Content reflects standard social discourse or objective reporting.{signifiers}"
        else:
            return f"Analysis suggests standard content, though some semantic ambiguities were processed."

# Test with User Example
post = "@CTP_Kenya @NPSOfficial_KE @DCI_Kenya @the_sambu @CSMechanism @APSKenya Aden Duale jinxed his boss. Al-Shabaab is planning to kill Kenyans. Few months later, here we are. #MapinduziKE"
markers = extract_forensic_markers(post)

print(f"--- POST ANALYSIS ---")
print(f"POST: {post}")
print(f"MARKERS: {markers}")
print("\n--- JUSTIFICATIONS ---")
print(f"SAFE (51.8%): {generate_granular_justification('Safe', 0.518, markers)}")
print(f"DEFAMATORY (47.2%): {generate_granular_justification('Defamatory', 0.472, markers)}")
print(f"HATE SPEECH (1.0%): {generate_granular_justification('Hate Speech', 0.01, markers)}")
