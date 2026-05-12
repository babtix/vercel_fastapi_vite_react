import asyncio
import lmstudio as lms
import sys
import os

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.settings import settings

async def debug_list_models():
    # Remove http:// for api_host if it exists
    api_host = settings.LMSTUDIO_BASE_URL.replace("http://", "").replace("https://", "")
    print(f"Connecting to LM Studio with api_host='{api_host}'...")
    
    try:
        async with lms.AsyncClient(api_host=api_host) as client:
            print("Client connected.")
            
            # Use getattr to avoid crash if method doesn't exist
            methods = dir(client.system)
            print(f"System methods: {methods}")
            
            # Try various potential method names based on common patterns
            potential_methods = [
                "list_downloaded_models",
                "listDownloadedModels",
                "list_models",
                "listModels"
            ]
            
            for method_name in potential_methods:
                if method_name in methods:
                    print(f"Found method: {method_name}. Calling it...")
                    try:
                        res = await getattr(client.system, method_name)()
                        print(f"Result from {method_name}: {res}")
                    except Exception as call_err:
                        print(f"Error calling {method_name}: {call_err}")
                else:
                    pass

    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_list_models())
