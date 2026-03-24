import easyocr
import requests
import logging
from PIL import Image
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_ocr():
    try:
        print("Initializing EasyOCR reader...")
        reader = easyocr.Reader(['en'], gpu=False)
        print("EasyOCR initialized.")
        
        # Using a public image with text for testing
        test_image_url = "https://raw.githubusercontent.com/JaidedAI/EasyOCR/master/examples/english.png"
        print(f"Fetching test image from: {test_image_url}")
        
        resp = requests.get(test_image_url, timeout=10)
        if resp.status_code == 200:
            print("Image fetched. Running OCR...")
            results = reader.readtext(resp.content)
            extracted_text = " ".join([res[1] for res in results])
            print(f"\nExtracted Text: {extracted_text}")
            if "WEST" in extracted_text or "EAT" in extracted_text:
                print("\nSUCCESS: OCR functionality verified successfully!")
            else:
                print("\nERROR: OCR extracted unexpected text.")
        else:
            print(f"ERROR: Failed to fetch image: {resp.status_code}")
            
    except Exception as e:
        print(f"ERROR: OCR Test failed: {e}")

if __name__ == "__main__":
    test_ocr()
