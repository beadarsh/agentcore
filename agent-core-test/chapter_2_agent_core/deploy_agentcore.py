import os
import time
from pathlib import Path

from bedrock_agentcore_starter_toolkit import Runtime
from boto3.session import Session


# Resolve the script's relative paths from this directory.
os.chdir(Path(__file__).resolve().parent)

# Use the AWS CLI/profile region, falling back to the agent's Bedrock region.
region = Session().region_name or "eu-north-1"

agentcore_runtime = Runtime()

# Configure a direct-code deployment and let the toolkit create supporting
# execution-role and S3 resources when needed.
agentcore_runtime.configure(
    entrypoint="agent.py",
    auto_create_execution_role=True,
    auto_create_s3=True,
    requirements_file="requirements.txt",
    region=region,
    agent_name="chapter_2_agent",
    deployment_type="direct_code_deploy",
    runtime_type="PYTHON_3_12",
)

# Launch the runtime, updating the existing agent if its name is already used.
launch_result = agentcore_runtime.launch(auto_update_on_conflict=True)

# Wait until the deployment reaches a final status, checking every 10 seconds.
status_response = agentcore_runtime.status()
status = status_response.endpoint["status"]

finished_statuses = {
    "READY",
    "CREATE_FAILED",
    "DELETE_FAILED",
    "UPDATE_FAILED",
}

while status not in finished_statuses:
    time.sleep(10)
    status_response = agentcore_runtime.status()
    status = status_response.endpoint["status"]
    print(status)

# Stop with an error if AgentCore did not report a ready runtime.
if status != "READY":
    raise RuntimeError(f"AgentCore deployment finished with status: {status}")

print(f"Agent ARN: {launch_result.agent_arn}")