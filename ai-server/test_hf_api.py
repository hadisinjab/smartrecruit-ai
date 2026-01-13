import requests
import os
import json

# Replace with your actual HF token if testing locally
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN", "")
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

ENDPOINTS_TO_TEST = [
    "https://api-inference.huggingface.co/models/gpt2",
    "https://router.huggingface.co/models/gpt2",
    "https://router.huggingface.co/hf-inference/models/gpt2",
    "https://router.huggingface.co/v1/models/gpt2",
]

PAYLOAD = {"inputs": "Hello, world", "parameters": {"max_new_tokens": 5}}

print(f"Testing with token: {HF_TOKEN[:5]}..." if HF_TOKEN else "Testing without token")

for url in ENDPOINTS_TO_TEST:
    print(f"\n--- Testing: {url} ---")
    try:
        r = requests.post(url, headers=HEADERS, json=PAYLOAD, timeout=10)
        print(f"Status: {r.status_code}")
        try:
            print(f"Response: {r.json()}")
        except:
            print(f"Raw Response: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {str(e)}")
