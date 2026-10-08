import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime';
import { Agent, tool, type ToolList } from '@strands-agents/sdk';
import { z } from 'zod';
import { loadModel } from './model/load.js';

const calculator = tool({
  name: 'calculator',
  description: 'Calculate using two numbers and one of +, -, *, or /.',
  inputSchema: z.object({
    a: z.number(),
    operator: z.enum(['+', '-', '*', '/']),
    b: z.number(),
  }),
  callback: ({ a, operator, b }) => {
    if (operator === '/' && b === 0) {
      return 'Cannot divide by zero.';
    }

    const result = {
      '+': () => a + b,
      '-': () => a - b,
      '*': () => a * b,
      '/': () => a / b,
    }[operator]();

    return `${a} ${operator} ${b} = ${result}`;
  },
});

const weather = tool({
  name: 'weather',
  description: 'Return the demo weather report.',
  inputSchema: z.object({}),
  callback: () => 'Very cold',
});

const tools: ToolList = [calculator, weather];

const SYSTEM_PROMPT = `
You are a helpful assistant. Use the calculator for math and the weather tool for weather requests.
The weather report is fixed demo text, not live weather.
`;

const requestSchema = z.object({
  prompt: z.string().default(''),
});

const AGENT_CACHE_LIMIT = 128;

// Reuses one Agent per sessionId so each session keeps its own in-process
// conversation history (best-effort; resets on cold start). A Map preserves
// insertion order, so it doubles as an LRU bounded to 128 sessions — a local
// dev process serving many sessions cannot leak history between them or grow
// without bound. On AgentCore Runtime each microVM serves a single session, so
// this holds one entry. For durable history, attach memory.
const agentCache = new Map<string, Agent>();

async function getOrCreateAgent(sessionId: string): Promise<Agent> {
  const existing = agentCache.get(sessionId);
  if (existing) {
    agentCache.delete(sessionId);
    agentCache.set(sessionId, existing);
    return existing;
  }
  if (agentCache.size >= AGENT_CACHE_LIMIT) {
    const oldest = agentCache.keys().next().value;
    if (oldest !== undefined) agentCache.delete(oldest);
  }
  const model = await loadModel();
  const agent = new Agent({
    model,
    systemPrompt: SYSTEM_PROMPT,
    tools,
  });
  agentCache.set(sessionId, agent);
  return agent;
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    async *process(payload, context) {
      const sessionId = context?.sessionId ?? 'default-session';
      const agent = await getOrCreateAgent(sessionId);

      // Snapshot history before streaming so a failed turn can be rolled back.
      // Agent.stream() appends the user message before invoking the model; on a
      // mid-stream error that user turn would otherwise linger in the cached
      // agent, and the next turn for this session would send consecutive user
      // messages (rejected by providers that require strict role alternation,
      // e.g. Anthropic). Restoring on error keeps the session reusable.
      const snapshot = agent.takeSnapshot({ include: ['messages'] });
      try {
        for await (const event of agent.stream(payload.prompt)) {
          if (
            event.type === 'modelStreamUpdateEvent' &&
            event.event?.type === 'modelContentBlockDeltaEvent' &&
            event.event.delta?.type === 'textDelta'
          ) {
            yield { data: event.event.delta.text };
          }
        }
      } catch (error) {
        agent.loadSnapshot(snapshot);
        throw error;
      }
    },
  },
});

app.run({ port: parseInt(process.env.PORT ?? '8080') });
