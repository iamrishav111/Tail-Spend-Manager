import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv('GEMINI_API_KEY')
print(f"Testing key: {key[:10]}...")

genai.configure(api_key=key)
try:
    models = genai.list_models()
    print("SUCCESS: Key is active and working.")
    for m in list(models)[:3]:
        print(f" - Found model: {m.name}")
except Exception as e:
    print(f"FAILURE: {e}")
