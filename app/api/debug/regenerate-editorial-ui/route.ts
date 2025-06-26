import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Regenerate Editorial Content</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .status {
      margin: 20px 0;
      padding: 15px;
      border-radius: 4px;
      background: #f0f0f0;
    }
    .status.success {
      background: #d4edda;
      color: #155724;
    }
    .status.error {
      background: #f8d7da;
      color: #721c24;
    }
    .status.processing {
      background: #cce5ff;
      color: #004085;
    }
    button {
      background: #0070f3;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-right: 10px;
    }
    button:hover {
      background: #0051cc;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #0070f3;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    pre {
      background: #f4f4f4;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 Regenerate Editorial Content</h1>
    <p>This tool regenerates headlines, decks, and pull quotes with enhanced context including parent summaries and dependency completions.</p>
    
    <div class="controls">
      <button id="startBtn" onclick="startRegeneration()">Start Regeneration</button>
      <button id="stopBtn" onclick="stopRegeneration()" disabled>Stop</button>
      <button onclick="clearLog()">Clear Log</button>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value" id="totalProcessed">0</div>
        <div class="stat-label">Processed</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="totalErrors">0</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="batchCount">0</div>
        <div class="stat-label">Batches</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="successRate">0%</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>
    
    <div id="status" class="status">Ready to start regeneration.</div>
    
    <h3>Log:</h3>
    <pre id="log">Waiting to start...</pre>
  </div>

  <script>
    let isRunning = false;
    let totalProcessed = 0;
    let totalErrors = 0;
    let batchCount = 0;
    let nextUrl = null;

    function updateStats() {
      document.getElementById('totalProcessed').textContent = totalProcessed;
      document.getElementById('totalErrors').textContent = totalErrors;
      document.getElementById('batchCount').textContent = batchCount;
      
      const total = totalProcessed + totalErrors;
      const rate = total > 0 ? ((totalProcessed / total) * 100).toFixed(1) : 0;
      document.getElementById('successRate').textContent = rate + '%';
    }

    function log(message) {
      const logEl = document.getElementById('log');
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      logEl.textContent += '\\n[' + timestamp + '] ' + message;
      logEl.scrollTop = logEl.scrollHeight;
    }

    function setStatus(message, type = '') {
      const statusEl = document.getElementById('status');
      statusEl.textContent = message;
      statusEl.className = 'status ' + type;
    }

    async function processBatch(url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      return await response.json();
    }

    async function startRegeneration() {
      if (isRunning) return;
      
      isRunning = true;
      document.getElementById('startBtn').disabled = true;
      document.getElementById('stopBtn').disabled = false;
      
      // Reset stats
      totalProcessed = 0;
      totalErrors = 0;
      batchCount = 0;
      updateStats();
      
      log('Starting regeneration process...');
      setStatus('Processing...', 'processing');
      
      // Start with the initial URL
      let currentUrl = '/api/debug/regenerate-editorial?limit=10';
      
      try {
        while (isRunning && currentUrl) {
          batchCount++;
          log(\`Processing batch \${batchCount}...\`);
          
          const result = await processBatch(currentUrl);
          
          totalProcessed += result.processed;
          totalErrors += result.errors;
          updateStats();
          
          log(\`Batch \${batchCount}: \${result.processed} processed, \${result.errors} errors\`);
          
          if (result.hasMore && result.nextUrl) {
            currentUrl = result.nextUrl;
            log('More items to process, continuing...');
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            currentUrl = null;
            log('All items processed!');
            setStatus('✅ Regeneration complete!', 'success');
            break;
          }
        }
      } catch (error) {
        log(\`Error: \${error.message}\`);
        setStatus(\`Error: \${error.message}\`, 'error');
      } finally {
        isRunning = false;
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
      }
    }

    function stopRegeneration() {
      if (!isRunning) return;
      
      isRunning = false;
      log('Stopping regeneration...');
      setStatus('Stopped by user', 'error');
    }

    function clearLog() {
      document.getElementById('log').textContent = 'Log cleared.';
      log('Ready to start...');
    }
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}