import { BedrockModel } from '@strands-agents/sdk/models/bedrock';

export function loadModel(): BedrockModel {
  return new BedrockModel({
    modelId: 'eu.amazon.nova-lite-v1:0',
    region: 'eu-north-1',
  });
}
