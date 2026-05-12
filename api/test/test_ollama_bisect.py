import asyncio
import ollama

async def test_with_options(label, options):
    client = ollama.AsyncClient(host="http://localhost:11434", timeout=120)
    test_model = "qwen3.5:0.8b"
    messages = [{"role": "user", "content": "Say hello in one word."}]
    
    try:
        full = ""
        chunk_count = 0
        async for chunk in await client.chat(model=test_model, messages=messages, stream=True, options=options):
            content = chunk.get("message", {}).get("content", "")
            full += content
            chunk_count += 1
        has_content = bool(full.strip())
        print(f"  [{label}] chunks={chunk_count}, has_content={has_content}, response={repr(full[:100])}")
        return has_content
    except Exception as e:
        print(f"  [{label}] ERROR: {e}")
        return False

async def main():
    print("=== Isolating which option breaks local models ===\n")
    
    # Test 1: no options at all
    await test_with_options("NO OPTIONS", {})
    
    # Test 2: only temperature
    await test_with_options("temp only", {"temperature": 0.7})
    
    # Test 3: only top_p
    await test_with_options("top_p only", {"top_p": 0.9})
    
    # Test 4: only top_k
    await test_with_options("top_k only", {"top_k": 40})
    
    # Test 5: only repeat_penalty
    await test_with_options("repeat_penalty only", {"repeat_penalty": 1.1})
    
    # Test 6: only num_predict
    await test_with_options("num_predict only", {"num_predict": 1024})
    
    # Test 7: only num_ctx
    await test_with_options("num_ctx only", {"num_ctx": 4096})
    
    # Test 8: only stop
    await test_with_options("stop only", {"stop": ["/kill","/stop","/quit","/exit","/end","/bye","/goodbye","/finish","/done","/terminer","/finir"]})
    
    # Test 9: all except stop
    await test_with_options("ALL EXCEPT STOP", {
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
        "repeat_penalty": 1.1,
        "num_predict": 1024,
        "num_ctx": 4096,
    })
    
    # Test 10: all with stop
    await test_with_options("ALL WITH STOP", {
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
        "repeat_penalty": 1.1,
        "num_predict": 1024,
        "num_ctx": 4096,
        "stop": ["/kill","/stop","/quit","/exit","/end","/bye","/goodbye","/finish","/done","/terminer","/finir"],
    })

if __name__ == "__main__":
    asyncio.run(main())
