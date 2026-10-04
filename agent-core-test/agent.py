import argparse

from strands import Agent, tool
from strands.models import BedrockModel
from strands_tools import calculator


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


# Main function for command-line use; -> None means it returns no value.
def main() -> None:
    # Create a parser for command-line arguments.
    parser = argparse.ArgumentParser()
    # Require the prompt the user wants to send to the agent.
    parser.add_argument("--prompt", required=True, help="What to ask the agent")
    # Read the command-line arguments into the args object.
    args = parser.parse_args()

    # Send the prompt to the Strands agent.
    response = agent(args.prompt)
    # Display the agent's response in the terminal.
    print(response)


# Run main only when this file is executed directly, not when it is imported.
if __name__ == "__main__":
    main()