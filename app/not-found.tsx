export default function NotFound() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>404 - Page Not Found</h1>
      <p>ActionBias MCP Server</p>
      <p style={{ color: '#666', fontSize: '14px' }}>
        This is an MCP (Model Context Protocol) server endpoint.
      </p>
    </div>
  );
}