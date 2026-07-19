import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamText, convertToModelMessages } from 'ai'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-chat-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/chat') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { messages, songData } = JSON.parse(body);

                  const google = createGoogleGenerativeAI({
                    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
                  });

                  const systemPrompt = `You are an expert music historian. You are analyzing sample relationships between songs.
The user is viewing a connection graph for:
Original Song: ${songData?.original ? `"${songData.original.songTitle}" by ${songData.original.artistName}` : 'Unknown'}
Connected Songs: ${songData?.connectedSongs?.map((s: any) => `"${s.songTitle}" by ${s.artistName} (${s.relationshipType})`).join(', ') || 'None'}

Please explain:
1. What this relationship means (how the songs are connected).
2. How the newer song used/sampled/interpolated the original.
3. The historical significance of this connection.
4. Any interesting facts or trivia about the tracks, artists, or sample itself.

Rules:
- If the relationship is not well-documented, clearly state so instead of making things up.
- Format your response using clean Markdown.
- Write in a highly informative, engaging, and professional tone.`;

                  const result = streamText({
                    model: google("gemini-3.5-flash"),
                    system: systemPrompt,
                    messages: await convertToModelMessages(messages),
                  });

                  // v5 renamed this from pipeDataStreamToResponse ->
                  // pipeUIMessageStreamToResponse. Must match what useChat
                  // expects (UI message stream, i.e. message.parts).
                  result.pipeUIMessageStreamToResponse(res);
                } catch (err: any) {
                  console.error("Vite chat middleware error:", err);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message || "Internal Server Error" }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.CLIENT_ID': JSON.stringify(env.CLIENT_ID),
      'process.env.CLIENT_SECRET': JSON.stringify(env.CLIENT_SECRET),
    },
    server: {
      proxy: {
        '/api/spotify-token': {
          target: 'https://accounts.spotify.com/api/token',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/spotify-token/, ''),
        }
      }
    }
  }
})