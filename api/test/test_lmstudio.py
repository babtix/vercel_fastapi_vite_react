import asyncio
import sys
import os

# Add the current directory to sys.path to import from services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services import lmstudio_service
from core.settings import settings

async def test_lmstudio_streaming():
    print(f"Testing LM Studio at {settings.LMSTUDIO_BASE_URL}...")
    print(f"Using model: {settings.LMSTUDIO_DEFAULT_MODEL}")
    
    messages = [
        {"role": "user", "content": "Hello, are you functional?"}
    ]
    
    try:
        print("Response: ", end="", flush=True)
        async for chunk in lmstudio_service.generate_chat_response_stream(messages):
            print(chunk, end="", flush=True)
        print("\n\nTest completed successfully!")
    except Exception as e:
        print(f"\n\nTest failed: {e}")
        print("Make sure LM Studio is running and the 'Local Server' is enabled (Port 1234 by default).")

if __name__ == "__main__":
    asyncio.run(test_lmstudio_streaming())
