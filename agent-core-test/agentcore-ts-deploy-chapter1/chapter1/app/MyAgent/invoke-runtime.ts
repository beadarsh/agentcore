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
const raw = await response.response.transformToString();
const answer = raw
  .split(/\r?\n/)
  .filter((line) => line.startsWith('data: '))
  .map((line) => JSON.parse(line.slice(6)) as string)
  .join('');

console.log(answer);