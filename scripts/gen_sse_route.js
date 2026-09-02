const fs = require('fs');
fs.mkdirSync('src/app/api/realtime', { recursive: true });

const sseRoute = `import { NextRequest } from 'next/server';
import { realtimeBus, RealtimeMessage } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const matchId = searchParams.get('matchId');
  const cityId = searchParams.get('cityId');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connection confirmation
      const initMessage = \`data: \${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\\n\\n\`;
      controller.enqueue(encoder.encode(initMessage));

      // 2. Setup listener handler
      const handleMessage = (msg: RealtimeMessage) => {
        try {
          const sseFormatted = \`event: \${msg.eventType}\\ndata: \${JSON.stringify(msg)}\\n\\n\`;
          controller.enqueue(encoder.encode(sseFormatted));
        } catch (e) {
          console.error('Error streaming SSE message:', e);
        }
      };

      // 3. Subscribe to relevant channels
      const channels: string[] = ['global'];
      if (userId) channels.push(\`user:\${userId}\`);
      if (matchId) channels.push(\`match:\${matchId}\`);
      if (cityId) channels.push(\`city:\${cityId}\`);

      channels.forEach((ch) => realtimeBus.on(ch, handleMessage));

      // 4. Heartbeat keepalive every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\\n\\n'));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // 5. Cleanup upon connection close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        channels.forEach((ch) => realtimeBus.off(ch, handleMessage));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
`;

fs.writeFileSync('src/app/api/realtime/route.ts', sseRoute.trim() + '\n', 'utf8');
console.log('[OK] Created src/app/api/realtime/route.ts');
