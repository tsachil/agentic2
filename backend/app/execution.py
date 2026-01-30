import os
import google.generativeai as genai
from typing import List, Dict, Any

class ExecutionService:
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv("GOOGLE_API_KEY", "your-api-key-here")
        genai.configure(api_key=api_key)
        
        # Generation config
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 1,
            "top_k": 1,
            "max_output_tokens": 2048,
        }

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
            # Initialize model with system instruction
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                generation_config=self.generation_config,
                system_instruction=system_prompt
            )

            # Convert history to Gemini format
            # Gemini expects 'user' and 'model' roles
            chat_history = []
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                chat_history.append({"role": role, "parts": [msg["content"]]})

            # Start chat with history
            chat = model.start_chat(history=chat_history)
            
            # Send message
            response = chat.send_message(user_prompt)
            return response.text
            
        except Exception as e:
            return f"Error executing agent: {str(e)}"

execution_service = ExecutionService()