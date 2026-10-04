from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import calculator


app = BedrockAgentCoreApp()


@tool
def weather() -> str:
    """Return the demo weather report."""
    return "Very cold"


model = BedrockModel(
    model_id="eu.amazon.nova-lite-v1:0",
    region_name="eu-north-1",
)

agent = Agent(
    model=model,
    tools=[calculator, weather],
    system_prompt=(
        "You are a helpful assistant. You can help with math calculations "
        "and tell the user the demo weather report."
    ),
)


@app.entrypoint
def invoke(payload):
    prompt = payload.get("prompt", "")
    if not isinstance(prompt, str) or not prompt.strip():
        return {"response": "Please provide a non-empty prompt."}

    result = agent(prompt.strip())
    return {"response": str(result)}


if __name__ == "__main__":
    app.run()