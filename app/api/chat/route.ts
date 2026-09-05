import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const SESSIONS_FILE = path.join(os.tmpdir(), 'chat_sessions.json');

// Helper to get session history
const getSessionHistory = (sessionId: string) => {
  if (!sessionId) return [];
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      return data[sessionId] || [];
    }
  } catch (e) {
    console.error("Error reading sessions:", e);
  }
  return [];
};

// Helper to save session history
const saveSessionHistory = (sessionId: string, newMessages: any[]) => {
  if (!sessionId) return;
  try {
    let data: any = {};
    if (fs.existsSync(SESSIONS_FILE)) {
      data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
    const current = data[sessionId] || [];
    data[sessionId] = [...current, ...newMessages];
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving sessions:", e);
  }
};

export async function POST(req: Request) {
  try {
    const { query, language, sessionId } = await req.json();

    const systemPrompt = `You are ManakMitra, an AI assistant for the Bureau of Indian Standards (BIS). 
Your job is to provide accurate, helpful information regarding Indian Standards, ISI mark, Hallmarking, and BIS certifications.
You must respond in ${language === 'hi' ? 'Hindi' : 'English'}.

CRITICAL: You must format your response EXACTLY like this:
First, provide your detailed response in markdown format. 
Then, on a new line, write exactly '|||METADATA|||' followed by a minified JSON object containing:
{"confidence":"high"|"medium"|"low","contextMode":"standards"|"hallmarking"|"general","followUpQuestions":["q1","q2"],"sources":[{"id":"1","title":"Title","type":"Standard","date":"2023","link":"#"}]}

Do NOT wrap the JSON in markdown blocks. Just output the raw text, the separator, and the raw JSON.`;

    const pastHistory = getSessionHistory(sessionId);
    
    const sanitizedHistory = pastHistory.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const resultStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow the exact format.' }] },
        ...sanitizedHistory,
        { role: 'user', parts: [{ text: query }] }
      ]
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of resultStream) {
            const chunkText = chunk.text;
            fullResponse += chunkText;
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          
          // Save the interaction to our simple db
          if (sessionId) {
            let pureText = fullResponse;
            if (fullResponse.includes('|||METADATA|||')) {
              pureText = fullResponse.split('|||METADATA|||')[0].trim();
            }
            saveSessionHistory(sessionId, [
              { role: 'user', text: query },
              { role: 'ai', text: pureText }
            ]);
          }
          controller.close();
        } catch (e) {
          console.error("Stream error", e);
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
    
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
