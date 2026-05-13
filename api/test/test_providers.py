"""
Quick test script to verify both Ollama and OpenRouter providers work
"""
import asyncio
from services import llm_service

async def test_provider(provider: str, model: str):
    print(f"\n{'='*50}")
    print(f"Testing {provider} with model: {model}")
    print('='*50)
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in one sentence."}
    ]
    
    try:
        response = ""
        async for chunk in llm_service.generate_chat_response_stream(messages, model=model, provider=provider):
            response += chunk
            print(chunk, end="", flush=True)
        
        print(f"\n\n[PASS] {provider} test successful!")
        return True
    except Exception as e:
        print(f"\n\n[FAIL] {provider} test failed: {e}")
        return False

async def main():
    from core.settings import settings
    print("LLM Provider Integration Test")
    print("="*50)
    
    # Test OpenRouter
    print("\n1. Testing OpenRouter...")
    openrouter_success = await test_provider("openrouter", settings.DEFAULT_MODEL_NAME)

    # Test Ollama
    print("\n2. Testing Ollama...")
    ollama_success = await test_provider("ollama", "deepseek-v3.1:671b-cloud")
    
    # Test LM Studio
    print("\n3. Testing LM Studio...")
    lmstudio_success = await test_provider("lmstudio", settings.LMSTUDIO_DEFAULT_MODEL)
    
    print("\n" + "="*50)
    print("Test Summary:")
    print(f"  OpenRouter: {'PASS' if openrouter_success else 'FAIL'}")
    print(f"  Ollama:     {'PASS' if ollama_success else 'FAIL'}")
    print(f"  LM Studio:  {'PASS' if lmstudio_success else 'FAIL'}")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
