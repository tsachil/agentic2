import os
import time
import re
import json
from google import genai
from google.genai import types
from typing import List, Dict, Any, Tuple
from .tools_registry import tool_service

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
            
        # Avoid requesting chain-of-thought. Keep responses concise and user-facing.
        prompt += "\nProvide a clear, user-facing response without revealing internal reasoning."
            
        return prompt

    async def execute_agent(self, agent_model: Any, user_prompt: str, history: List[Dict[str, str]] = []) -> Dict[str, Any]:
        """
        Returns a dictionary with:
        - response_text: The public response
        - log_data: Dict containing full context, raw response, thought process, timing
        """
        start_time = time.time()
        
        system_prompt = self.construct_system_prompt(
            agent_model.name, 
            agent_model.purpose, 
            agent_model.personality_config or {}
        )

        # Prepare tools
        gemini_tools = []
        tools_map = {}
        if hasattr(agent_model, "tools") and agent_model.tools:
            # Map tools to Gemini format
            functions = []
            for tool in agent_model.tools:
                if not tool.is_active: continue
                
                # Sanitize name for Gemini (alphanumeric + underscores only)
                safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', tool.name)
                tools_map[safe_name] = tool # Map safe name back to tool model
                
                # Sanitize schema for Gemini SDK
                # Remove keys that might cause Pydantic validation errors in types.Schema or FunctionDeclaration
                sanitized_schema = tool.parameter_schema.copy() if tool.parameter_schema else {}
                for forbidden in ["id", "$schema", "title", "$id"]:
                    if forbidden in sanitized_schema:
                        del sanitized_schema[forbidden]
                
                # Ensure root type is object
                if "type" not in sanitized_schema:
                    sanitized_schema["type"] = "object"
                elif sanitized_schema["type"] != "object":
                    # If it's something else (unlikely for tool args), force it or wrap it?
                    # For now, let's assume if it's not object, it's malformed for a function declaration root.
                    sanitized_schema["type"] = "object"

                functions.append(types.FunctionDeclaration(
                    name=safe_name,
                    description=tool.description,
                    parameters=sanitized_schema
                ))
            
            if functions:
                gemini_tools.append(types.Tool(function_declarations=functions))

        tool_events: List[Dict[str, Any]] = []
        log_payload = {
            "prompt_context": {
                "system_prompt": system_prompt,
                "history": history,
                "user_prompt": user_prompt,
                "available_tools": [t.name for t in (getattr(agent_model, 'tools', []) or []) if t.is_active],
                "tool_events": tool_events,
            },
            "raw_response": "",
            "thought_process": "",
            "tool_events": tool_events,
            "execution_time_ms": 0
        }

        try:
            # Update config with system instruction and tools
            run_config = types.GenerateContentConfig(
                temperature=self.generation_config.temperature,
                top_p=self.generation_config.top_p,
                top_k=self.generation_config.top_k,
                max_output_tokens=self.generation_config.max_output_tokens,
                system_instruction=system_prompt,
                tools=gemini_tools if gemini_tools else None
            )

            # Convert history to Gemini format
            chat_history = []
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                chat_history.append({"role": role, "parts": [{"text": msg["content"]}]})

            # Start chat session
            chat = self.client.aio.chats.create(
                model="gemini-2.0-flash",
                config=run_config,
                history=chat_history
            )
            
            # First turn
            response = await chat.send_message(user_prompt)
            
            # Tool Use Loop (Max 5 iterations to prevent infinite loops)
            for _ in range(5):
                # Analyze parts for text (thoughts) and function calls
                content_parts = response.candidates[0].content.parts
                function_calls = []

                for part in content_parts:
                    if part.function_call:
                        function_calls.append(part.function_call)

                if not function_calls:
                    break
                
                tool_responses = []
                for fc in function_calls:
                    tool_name = fc.name
                    # Convert MapComposite to dict for serialization
                    args = dict(fc.args) if fc.args else {}
                    
                    log_event = {"tool": tool_name, "input": args, "output": None}
                    
                    tool_model = tools_map.get(tool_name)
                    if tool_model:
                        result, metadata = await tool_service.execute_tool(tool_model, args)
                        log_event["output"] = result
                        log_event["metadata"] = metadata
                        
                        # Format response for Gemini
                        tool_responses.append(types.Part(
                            function_response=types.FunctionResponse(
                                name=tool_name,
                                response={"result": result}
                            )
                        ))
                    else:
                        tool_responses.append(types.Part(
                            function_response=types.FunctionResponse(
                                name=tool_name,
                                response={"result": "Error: Tool not found"}
                            )
                        ))
                    
                    log_payload["tool_events"].append(log_event)

                # Send tool results back to the model
                response = await chat.send_message(tool_responses)

            # Final response processing - extract text from parts
            content_parts = response.candidates[0].content.parts
            raw_text = "\n".join([part.text for part in content_parts if part.text])
            
            # Remove any internal thought tags from final response if present
            final_response = re.sub(r'<thought>.*?</thought>', '', raw_text, flags=re.DOTALL).strip()
            
            end_time = time.time()
            execution_time = int((end_time - start_time) * 1000)
            
            log_payload["raw_response"] = raw_text
            log_payload["thought_process"] = ""
            log_payload["execution_time_ms"] = execution_time
            
            return {
                "response_text": final_response,
                "log_data": log_payload
            }
            
        except Exception as e:
            end_time = time.time()
            log_payload["raw_response"] = f"ERROR: {str(e)}"
            log_payload["execution_time_ms"] = int((end_time - start_time) * 1000)
            
            return {
                "response_text": f"Error executing agent: {str(e)}",
                "log_data": log_payload
            }

execution_service = ExecutionService()
