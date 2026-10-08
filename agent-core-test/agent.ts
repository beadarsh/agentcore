import { Agent, BedrockModel, tool } from '@strands-agents/sdk';
import { z } from 'zod';

const model = new BedrockModel({
  modelId: 'eu.amazon.nova-lite-v1:0',
  region: 'eu-north-1',
});

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

const agent = new Agent({
  model,
  tools: [calculator, weather],
  systemPrompt:
    'You are a helpful assistant. Use the calculator for math and the weather tool for weather requests. The weather report is fixed demo text, not live weather.',
});

async function main(): Promise<void> {
  const promptIndex = process.argv.indexOf('--prompt');
  const prompt = promptIndex >= 0 ? process.argv[promptIndex + 1] : undefined;

  if (!prompt) {
    console.error('Usage: npm run agent -- --prompt "Your question"');
    process.exitCode = 2;
    return;
  }

  const response = await agent.invoke(prompt);
  console.log(response);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});