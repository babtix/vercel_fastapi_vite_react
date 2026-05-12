# LM Studio Integration Guide

This backend supports both **Ollama** and **LM Studio** as LLM providers. Since both are local-first solutions, this ensures your data stays private and secure.

## Configuration

To use LM Studio, you need to configure your environment variables in the `.env` file:

```env
# Choose your default provider: "ollama" or "lmstudio"
DEFAULT_LLM_PROVIDER="lmstudio"

# LM Studio Configuration
LMSTUDIO_BASE_URL="http://localhost:1234"
LMSTUDIO_DEFAULT_MODEL="your-model-id-here"
```

## How to Set Up LM Studio

1. **Download & Install**: Visit [lmstudio.ai](https://lmstudio.ai/) to download the application.
2. **Download a Model**: Search for a model (e.g., `DeepSeek-R1-Distill-Qwen-7B`) and download it.
3. **Start the Local Server**:
   - Go to the **Local Server** tab (the double-arrow icon `<->` on the left).
   - Select your model from the dropdown at the top.
   - Click **Start Server**.
   - Ensure the port is set to `1234` (default).
4. **Get Model ID**: The Model ID will be displayed in the server logs or the model selection dropdown. Paste this into your `LMSTUDIO_DEFAULT_MODEL` setting.

## Testing the Connection

You can test if the integration is working correctly by running the provided test script:

```bash
python backend/test_lmstudio.py
```

## Creating Agents with LM Studio

When creating or updating an agent via the API or Admin panel, you can specify the provider:

```json
{
  "name": "LM Expert",
  "provider": "lmstudio",
  "model_name": "the-model-id"
}
```

If `provider` is not specified, it will fall back to the `DEFAULT_LLM_PROVIDER` set in your environment.
