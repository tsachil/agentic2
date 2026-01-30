import os
from google import genai
from google.genai import types
from typing import List, Dict, Any

class ExecutionService:
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv("GOOGLE_API_KEY", "your-api-key-here")
        self.client = genai.Client(api_key=api_key)
        
        # Generation config
        self.generation_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=1.0,
            top_k=1,
            max_output_tokens=2048,
        )

    def construct_system_prompt(self, agent_name: str, purpose: str, personality: Dict[str, Any]) -> str:
        # personality traits: formality, verbosity, creativity, empathy, assertiveness (0.0 - 1.0)
        formality = "formal" if personality.get("formality", 0.5) > 0.5 else "casual"
        verbosity = "detailed" if personality.get("verbosity", 0.5) > 0.5 else "concise"
        
        prompt = f"You are {agent_name}. Your primary purpose is: {purpose}.\n"
        prompt += f"Maintain a {formality} tone and be {verbosity} in your responses.\n"
        
        if personality.get("creativity", 0.5) > 0.7:
            prompt += "Be highly innovative and think outside the box.\n"
        if personality.get("empathy", 0.5) > 0.7:
            prompt += "Show high empathy and emotional intelligence.\n"
        if personality.get("assertiveness", 0.5) > 0.7:
            prompt += "Be assertive and direct in your communication.\n"
            
        return prompt

    async def execute_agent(self, agent_model: Any, user_prompt: str, history: List[Dict[str, str]] = []) -> str:
        system_prompt = self.construct_system_prompt(
            agent_model.name, 
            agent_model.purpose, 
            agent_model.personality_config or {}
        )

        try:
            # Update config with system instruction for this specific call
            # Note: In the new SDK, system_instruction is part of the config
            run_config = types.GenerateContentConfig(
                temperature=self.generation_config.temperature,
                top_p=self.generation_config.top_p,
                top_k=self.generation_config.top_k,
                max_output_tokens=self.generation_config.max_output_tokens,
                system_instruction=system_prompt
            )

            # Convert history to Gemini format
            # Gemini expects 'user' and 'model' roles
            chat_history = []
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                chat_history.append({"role": role, "parts": [{"text": msg["content"]}]})

            # Start chat with history
            chat = self.client.chats.create(
                model="gemini-2.0-flash",
                config=run_config,
                history=chat_history
            )
            
            # Send message
            response = await chat.send_message_async(user_prompt)
            return response.text
            
        except Exception as e:
            return f"Error executing agent: {str(e)}"

execution_service = ExecutionService()