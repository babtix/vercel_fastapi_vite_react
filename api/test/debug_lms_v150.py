import asyncio
import lmstudio as lms
import sys
import os

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.settings import settings

async def debug_lms_150():
    # Try with the IP from the screenshot if localhost fails
    hosts = ["localhost:1234", "26.194.16.45:1234"]
    
    for host in hosts:
        print(f"\n--- Testing host: {host} ---")
        try:
            async with lms.AsyncClient(api_host=host) as client:
                print("Connected!")
                models = await client.list_downloaded_models()
                print(f"Found {len(models)} models.")
                for i, m in enumerate(models):
                    print(f"Model {i}: {type(m)}")
                    # Print all attributes
                    attrs = [a for a in dir(m) if not a.startswith('_')]
                    print(f"  Attributes: {attrs}")
                    for attr in attrs:
                        try:
                            val = getattr(m, attr)
                            if not callable(val):
                                print(f"    {attr}: {val}")
                        except:
                            pass
        except Exception as e:
            print(f"Error with {host}: {e}")

if __name__ == "__main__":
    asyncio.run(debug_lms_150())
