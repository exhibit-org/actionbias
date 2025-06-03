export default function HomePage() {
  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem',
      lineHeight: 1.6
    }}>
      <h1>ActionBias</h1>
      <p>
        A Next.js MCP (Model Context Protocol) server for managing hierarchical actions with dependencies.
      </p>
      
      <h2>Features</h2>
      <ul>
        <li><strong>Action Management</strong> - Create, list, and delete actions</li>
        <li><strong>Hierarchical Organization</strong> - Parent/child relationships for project structure</li>
        <li><strong>Dependency Tracking</strong> - Sequential dependencies for execution order</li>
        <li><strong>MCP Compatible</strong> - Works with Claude Desktop and other MCP clients</li>
      </ul>

      <h2>MCP Server</h2>
      <p>
        The MCP server is available at <code>/mcp</code> with the following tools:
      </p>
      <ul>
        <li><code>create_action</code> - Create actions with optional parent and dependencies</li>
        <li><code>list_actions</code> - List all actions with pagination</li>
        <li><code>add_child_action</code> - Create child actions</li>
        <li><code>add_dependency</code> - Create execution dependencies</li>
        <li><code>delete_action</code> - Delete actions with child handling options</li>
        <li><code>remove_dependency</code> - Remove specific dependencies</li>
      </ul>

      <h2>Usage</h2>
      <p>
        Connect your MCP client to this server to start managing your action networks.
        The server supports both hierarchical organization (parent/child) and execution 
        sequencing (dependencies) as separate concerns.
      </p>
    </div>
  );
}