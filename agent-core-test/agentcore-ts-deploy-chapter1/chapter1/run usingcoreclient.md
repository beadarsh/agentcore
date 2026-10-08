# Invoke the AgentCore Runtime with the AWS SDK

This guide invokes the deployed `MyAgent` runtime directly with the AWS SDK for JavaScript v3. The supplied `BedrockAgentCoreClient` snippet is JavaScript/TypeScript, not Python Boto3.

## Prerequisites

- Deploy the `chapter1` project first.
- Use AWS credentials authorized to invoke the runtime. Check the active identity with `aws sts get-caller-identity`.
- The AWS identity needs `bedrock-agentcore:InvokeAgentRuntime` access to the runtime.
- Node.js and npm are installed. The TypeScript app already includes `tsx`.

The example below uses the runtime ARN supplied for this deployment:

`arn:aws:bedrock-agentcore:eu-north-1:832721569460:runtime/chapter1_MyAgent-k1kfR746CJ`

If the runtime is redeployed and its ARN changes, replace this value with the current ARN.

## Install the SDK

In PowerShell, change to the TypeScript app directory and install the AgentCore Runtime client:

```powershell
Set-Location C:\Dev\udemy-agent-core\agent-core-test\agentcore-ts-deploy-chapter1\chapter1\app\MyAgent
npm install @aws-sdk/client-bedrock-agentcore
```

## Create the Caller Script

Create `app/MyAgent/invoke-runtime.ts` with this code:

```typescript
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';

const inputText = 'Explain machine learning in simple terms';
const client = new BedrockAgentCoreClient({ region: 'eu-north-1' });

const input = {
  runtimeSessionId: 'chapter1-session-00000000000000000001',
  agentRuntimeArn:
    'arn:aws:bedrock-agentcore:eu-north-1:832721569460:runtime/chapter1_MyAgent-k1kfR746CJ',
  contentType: 'application/json',
  accept: 'text/event-stream',
  payload: new TextEncoder().encode(JSON.stringify({ prompt: inputText })),
};

const command = new InvokeAgentRuntimeCommand(input);
const response = await client.send(command);
console.log(await response.response.transformToString());
```

The runtime's request schema expects a JSON object containing a string `prompt`, so encode `{ prompt: inputText }` rather than sending the prompt as plain text. Its handler streams output, so `accept: 'text/event-stream'` is required; without it, the runtime returns HTTP 406. `runtimeSessionId` must be at least 33 characters. Reuse the same ID for turns in one conversation; use a different ID for a new session. The example ID is long enough and is intended for a single test session.

The `qualifier` is omitted so the runtime uses its default endpoint. Add `qualifier: 'YOUR_ENDPOINT_NAME'` only when invoking a named endpoint.

## Run the Caller

From the `app/MyAgent` directory:

```powershell
npx tsx .\invoke-runtime.ts
```

The response should contain the runtime's answer. The call reaches Bedrock through the deployed runtime and may incur charges.
