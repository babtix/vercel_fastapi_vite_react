import asyncio
import ollama

async def main():
    print("=== Testing Ollama Connection ===")
    
    # Test 1: List models
    print("\n1. Listing models...")
    try:
        client = ollama.AsyncClient(host="http://localhost:11434", timeout=10)
        response = await client.list()
        for m in response.models:
            name = m.model or ""
            size_bytes = m.size or 0
            size_gb = round(size_bytes / (1024 ** 3), 2)
            is_cloud = "cloud" in name.lower()
            print(f"   Model: {name} | Size: {size_gb}GB | Cloud: {is_cloud}")
    except Exception as e:
        print(f"   ERROR listing models: {type(e).__name__}: {e}")

    # Test 2: Try a simple chat with a local (non-cloud) model
    print("\n2. Trying chat with a local model...")
    try:
        client = ollama.AsyncClient(host="http://localhost:11434", timeout=120)
        response = await client.list()
        
        # Find a local model (non-cloud)
        local_models = [m.model for m in response.models if "cloud" not in (m.model or "").lower()]
        cloud_models = [m.model for m in response.models if "cloud" in (m.model or "").lower()]
        
        print(f"   Local models: {local_models}")
        print(f"   Cloud models: {cloud_models}")
        
        if local_models:
            test_model = local_models[0]
            print(f"\n   Testing with local model: {test_model}")
            messages = [{"role": "user", "content": "Say hello in one word."}]
            
            print("   Sending chat request (stream=True)...")
            full = ""
            async for chunk in await client.chat(model=test_model, messages=messages, stream=True):
                content = chunk.get("message", {}).get("content", "")
                full += content
            print(f"   Response: {full}")
        else:
            print("   No local models found to test")
            
        # Test 3: Try cloud model
        if cloud_models:
            test_model = cloud_models[0]
            print(f"\n3. Testing with cloud model: {test_model}")
            messages = [{"role": "user", "content": "Say hello in one word."}]
            
            print("   Sending chat request (stream=True)...")
            full = ""
            async for chunk in await client.chat(model=test_model, messages=messages, stream=True):
                content = chunk.get("message", {}).get("content", "")
                full += content
            print(f"   Response: {full}")
    except Exception as e:
        import traceback
        print(f"   ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
