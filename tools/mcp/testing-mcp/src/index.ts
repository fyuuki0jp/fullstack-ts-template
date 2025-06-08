import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createDecisionTableTool } from './tools/create-decision-table.js';
import { generateTestsTool } from './tools/generate-tests.js';
import { listDecisionTablesTool } from './tools/list-decision-tables.js';
import { getDecisionTableTool } from './tools/get-decision-table.js';
import { analyzeCoverageTool } from './tools/analyze-coverage.js';

const server = new Server(
  {
    name: 'testing-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
const tools = [
  createDecisionTableTool,
  generateTestsTool,
  listDecisionTablesTool,
  getDecisionTableTool,
  analyzeCoverageTool,
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name);
  
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  try {
    const args = request.params.arguments as any;
    const result = await tool.execute(args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Testing MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});