# AgentCore Project

This project was created with the [AgentCore CLI](https://github.com/aws/agentcore-cli).

## Project Structure

```
my-project/
├── AGENTS.md               # AI coding assistant context
├── agentcore/
│   ├── agentcore.json      # Project config (agents, memories, credentials, gateways, evaluators)
│   ├── aws-targets.json    # Deployment targets (account + region)
│   ├── .env.local          # Secrets — API keys (gitignored)
│   ├── .llm-context/       # TypeScript type definitions for AI assistants
│   │   ├── agentcore.ts    # AgentCoreProjectSpec types
│   │   └── aws-targets.ts  # Deployment target types
│   └── cdk/                # CDK infrastructure (@aws/agentcore-cdk)
├── app/                    # Agent application code
└── evaluators/             # Custom evaluator code (if any)
```

## Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **Python 3.10+** and **uv** for Python agents ([install uv](https://docs.astral.sh/uv/getting-started/installation/))
- **AWS credentials** configured (`aws configure` or environment variables)
- **Docker** (only for Container build agents)

### Development

Run your agent locally:

```bash
agentcore dev
```

### Calculator and Weather Agent

This project ports the standalone `agent-core-test/agent.ts` into an AgentCore Runtime app. The runtime code is in
`app/MyAgent/`; the AgentCore project root is the directory containing `agentcore/`, `app/`, and this README.

#### Create the AgentCore Project

The project was scaffolded with the AgentCore CLI in a new folder, separate from the standalone `agent.ts` project.
To reproduce the same layout in PowerShell:

```powershell
Set-Location C:\Dev\udemy-agent-core\agent-core-test
New-Item -ItemType Directory .\agentcore-ts-deploy-chapter1
Set-Location .\agentcore-ts-deploy-chapter1
agentcore create
```

In the CLI prompts, choose TypeScript and Strands, name the generated project `chapter1`, and leave the advanced
settings unchecked for the initial setup. The CLI creates `chapter1/` beneath the current directory. The resulting
AgentCore project root is `C:\Dev\udemy-agent-core\agent-core-test\agentcore-ts-deploy-chapter1\chapter1`.
If the parent folder already exists, skip the `New-Item` command and enter it before running `agentcore create`.

#### Port the Standalone Agent

1. In `app/MyAgent/main.ts`, keep the AgentCore-specific structure: `BedrockAgentCoreApp`, the `requestSchema` for
	`{ prompt: string }`, the invocation handler, and `app.run(...)`. The handler receives `payload.prompt` and streams
	the response from Strands.
2. Replace the generated `addNumbers` sample tool with the standalone `calculator` and `weather` tools. Keep their Zod
	`inputSchema` definitions and callbacks, set `const tools: ToolList = [calculator, weather]`, and update
	`SYSTEM_PROMPT` to direct math requests to the calculator and weather requests to the demo weather tool. Weather is
	fixed demo text (`Very cold`), not live weather.
3. In `app/MyAgent/model/load.ts`, configure the Strands `BedrockModel` with model ID
	`eu.amazon.nova-lite-v1:0` and region `eu-north-1`.
4. Do not copy the standalone command-line wrapper (`process.argv`, `main()`, or `agent.invoke(prompt)`). AgentCore
	supplies the prompt in the runtime request; the generated handler calls `agent.stream(payload.prompt)` instead.
	Likewise, keep agent creation inside the generated session-aware `getOrCreateAgent()` function.
5. The generated app already includes `@strands-agents/sdk` and `zod`. Keep the runtime and request validation code;
	unused generated MCP client files can remain in the project without being connected to the tools list.

#### Build and Run Locally

Open PowerShell at the project root (the folder containing `agentcore/` and `app/`) and validate the config, then build
the TypeScript app:

```powershell
agentcore validate
Push-Location .\app\MyAgent
npm run build
Pop-Location
```

Start the local AgentCore server from the project root:

```powershell
agentcore dev
```

`agentcore dev` keeps running in that terminal. In a second PowerShell terminal, change to the same project root and
invoke the local runtime:

```powershell
agentcore invoke --dev "Calculate 24 times 7 and tell me the weather."
```

The result should include `168` and `Very cold`. This sends a Bedrock request and may incur model charges.

#### Deploy to AWS

1. Configure AWS credentials and confirm the active account:

	```powershell
	aws sts get-caller-identity
	```

	 Use the 12-digit `Account` value from the output in `agentcore/aws-targets.json`. The file must contain an array of
	 deployment targets. For example:

	 ```json
	 [
		 {
			 "name": "dev",
			 "account": "YOUR_12_DIGIT_ACCOUNT_ID",
			 "region": "eu-north-1"
		 }
	 ]
	 ```

	 Keep the region consistent with the Nova Lite model configuration in `app/MyAgent/model/load.ts`. Do not commit
	 AWS credentials or secret keys to this file.

2. Confirm that:

	- The credentials used by the CLI can deploy the required AgentCore/CDK resources in the selected AWS account.
	- The deployed runtime execution role has permission to invoke the Nova Lite inference profile in `eu-north-1`.
	- The selected account has access to that Bedrock inference profile.

3. From the `chapter1` project root (the directory containing `agentcore/` and `app/`), validate and deploy:

	```powershell
	Set-Location C:\Dev\udemy-agent-core\agent-core-test\agentcore-ts-deploy-chapter1\chapter1
	agentcore validate
	agentcore deploy
	```

4. After deployment completes, check its status and invoke it:

	```powershell
	agentcore status
	agentcore invoke --target dev "Calculate 24 times 7 and tell me the weather."
	```

#### CDK Build Troubleshooting

If deployment fails at **Build CDK project** with TypeScript errors saying CDK modules or Node/Jest types cannot be
found, install the CDK project's dependencies and retry the build. Run this from the `chapter1` project root:

```powershell
Push-Location .\agentcore\cdk
npm install
npm run build
Pop-Location
```

Then retry `agentcore deploy` from the project root. In this project, the failure occurred because the CDK
`node_modules` directory was empty; installing the dependencies made the CDK TypeScript build pass. `npm install` may
report dependency audit advisories; review them separately rather than applying automatic breaking upgrades.

Deployment provisions AWS resources and can incur AWS charges; model invocations may also incur Bedrock charges.

### Validate Invocation Input

Validate runtime invocation payloads before forwarding them to an agent framework. Keep user prompts typed as strings
and pass only prompt text to the agent.

### Deployment

Deploy to AWS:

```bash
agentcore deploy
```

## Commands

| Command | Description |
| --- | --- |
| `agentcore create` | Create a new AgentCore project |
| `agentcore add` | Add resources (agent, memory, credential, gateway, evaluator, policy) |
| `agentcore remove` | Remove resources |
| `agentcore dev` | Run agent locally with hot-reload |
| `agentcore deploy` | Deploy to AWS via CDK |
| `agentcore status` | Show deployment status |
| `agentcore invoke` | Invoke agent (local or deployed) |
| `agentcore logs` | View agent logs |
| `agentcore traces` | View agent traces |
| `agentcore eval` | Run evaluations |
| `agentcore package` | Package agent artifacts |
| `agentcore validate` | Validate configuration |
| `agentcore pause` | Pause a deployed agent |
| `agentcore resume` | Resume a paused agent |
| `agentcore fetch` | Fetch remote resource definitions |
| `agentcore import` | Import existing resources |
| `agentcore update` | Check for CLI updates |

## Configuration

Edit the JSON files in `agentcore/` to configure your project. See `agentcore/.llm-context/` for type definitions and validation constraints.

The project uses a **flat resource model** — agents, memories, credentials, gateways, evaluators, and policies are top-level arrays in `agentcore.json`. Resources are independent; agents discover memories and credentials at runtime via environment variables or SDK calls.

## Resources

| Resource | Purpose |
| --- | --- |
| Agent (runtime) | HTTP, MCP, or A2A agent deployed to AgentCore Runtime |
| Memory | Persistent context storage with configurable strategies |
| Credential | API key or OAuth credential providers |
| Gateway | MCP gateway that routes tool calls to targets |
| Gateway Target | Tool implementation (Lambda, MCP server, OpenAPI, Smithy, API Gateway) |
| Evaluator | Custom LLM-as-a-Judge or code-based evaluation |
| Online Eval Config | Continuous evaluation pipeline for deployed agents |
| Policy | Cedar authorization policies for gateway tools |

### Agent Types

- **Template agents**: Created from framework templates (Strands, LangChain/LangGraph, GoogleADK, OpenAI Agents, Autogen)
- **BYO agents**: Bring your own code with `agentcore add agent --type byo`
- **Import agents**: Import existing Bedrock agents with `agentcore import`

### Build Types

- **CodeZip**: Python source packaged as a zip and deployed directly to AgentCore Runtime
- **Container**: Docker image built via CodeBuild (ARM64), pushed to ECR, and deployed to AgentCore Runtime

## Documentation

- [AgentCore CLI](https://github.com/aws/agentcore-cli)
- [AgentCore CDK Constructs](https://github.com/aws/agentcore-l3-cdk-constructs)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
