import { StateGraph } from '@langchain/langgraph';
import { ChatGraphState } from './state';
import { routerNode } from './router';
import { agentNode } from './agent';

export function createChatGraph() {
  const graph = new StateGraph(ChatGraphState)
    .addNode('router', routerNode)
    .addNode('agent', agentNode)
    .addEdge('__start__', 'router')
    .addEdge('router', 'agent')
    .addEdge('agent', '__end__');

  return graph.compile();
}
