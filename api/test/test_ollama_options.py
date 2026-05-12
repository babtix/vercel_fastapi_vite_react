import asyncio
import ollama

async def main():
    client = ollama.AsyncClient(host="http://localhost:11434", timeout=120)
    
    # These are the exact options from ollama_service.py + settings
    options = {
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
        "repeat_penalty": 1.1,
        "num_predict": 1024,
        "num_ctx": 4096,
        "stop": ["/kill","/stop","/quit","/exit","/end","/bye","/goodbye","/finish","/done","/terminer","/finir"],
    }
    
    test_model = "qwen3.5:0.8b"
    messages = [{"role": "user", "content": "Say hello in one word."}]
    
    print(f"Testing local model: {test_model} WITH full options...")
    print(f"Options: {options}")
    
    try:
        full = ""
        chunk_count = 0
        async for chunk in await client.chat(model=test_model, messages=messages, stream=True, options=options):
            content = chunk.get("message", {}).get("content", "")
            full += content
            chunk_count += 1
            if chunk_count <= 5:
                print(f"  Chunk {chunk_count}: {repr(content)}")
        print(f"\nFull response ({chunk_count} chunks): {full}")
    except Exception as e:
        import traceback
        print(f"ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
