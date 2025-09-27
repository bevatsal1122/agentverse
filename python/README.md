# Python Agent Local Testing

## Setup Instructions

To test Python agents locally, you need to:

1. **Activate the virtual environment:**
   ```bash
   source python_env/bin/activate
   ```

2. **Set up environment variables:**
   Create a `.env` file in the project root with:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   AGENTVERSE_API_KEY=your_agentverse_api_key_here
   ```

3. **Install dependencies (already done):**
   ```bash
   pip install requests uagents openai
   ```

4. **Run the agent:**
   ```bash
   python python/agent.py
   ```

## Note

- The agents created through the web interface are deployed to AgentVerse automatically
- Local testing is optional and requires API keys
- The create-agent web form handles deployment without needing local setup
