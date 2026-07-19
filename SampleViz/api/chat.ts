import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages } from "ai";

export const config = {
  runtime: "edge",
};

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { messages, songData } = await req.json();

    const systemPrompt = `You are an expert music historian. You are analyzing sample relationships between songs.
The user is viewing a connection graph for:
Original Song: ${songData?.original ? `"${songData.original.songTitle}" by ${songData.original.artistName}` : 'Unknown'}
Connected Songs: ${songData?.connectedSongs?.map((s: any) => `"${s.songTitle}" by ${s.artistName} (${s.relationshipType})`).join(', ') || 'None'}

Please explain:
1. What this relationship means (how the songs are connected, e.g., sampling, interpolation, parody).
2. How the newer song used/sampled/interpolated the original.
3. The historical significance of this connection.
4. Any interesting facts or trivia about the tracks, artists, or sample itself.

Rules:
- If the relationship is not well-documented, clearly state so instead of making things up.
- Format your response using clean Markdown.
- Write in a highly informative, engaging, and professional tone.`;

    const result = streamText({
      model: googleProvider("gemini-3.5-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    // useChat on the client reads UI message parts (message.parts), which
    // requires the UI message stream protocol, not a plain text stream.
    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Vercel Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}