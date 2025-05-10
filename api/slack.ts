// api/slack.ts
import { SlackApp, Assistant } from 'slack-edge'
import { waitUntil } from '@vercel/functions'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Edge Runtime
export const config = {
  runtime: 'edge'
}

// Set up Slack App
const app = new SlackApp({
  env: {
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET!,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN!,
    SLACK_LOGGING_LEVEL: 'ERROR'
  }
})

// Create Assistant
app.assistant(
  new Assistant({
    threadStarted: async ({ context: { say, setSuggestedPrompts } }) => {
      await say({ text: '🐮 Hi, how can I help you today?' })
      await setSuggestedPrompts({
        title: '💡 Ideas to get you started',
        prompts: ['Brainstorm a new project', 'Ideas to cut my carbon footprint', 'What flowers are in season?']
      })
    },
    userMessage: async ({ payload, context: { client, setStatus, setTitle, say } }) => {
      // Set assistant status in bottom bar
      await setStatus({ status: 'is typing...' })

      // Retrieve message history
      const thread = await client.conversations.replies({
        channel: payload.channel,
        ts: payload.thread_ts || payload.ts,
        oldest: payload.thread_ts || payload.ts,
        latest: payload.ts
      })

      // System prompt definition
      const systemPrompt = '- You are a helpful assistant who is an expert on the environment, climate change and regenerative agriculture.\n- Format your responses with markdown and emojis.';

      // Extract the current user message
      const currentUserMessage = payload.text || '';

      // Map thread messages to the format requested (similar to what would be sent to AI SDK)
      const systemMessage = { role: 'system', content: systemPrompt };

      // First, log the raw thread messages with timestamps for debugging
      console.log('🧵 Raw thread messages:', thread.messages?.map(m => ({
        ts: m.ts,
        text: m.text,
        bot_id: m.bot_id ? true : false,
        user: m.user
      })));

      // Sort messages by timestamp to ensure correct chronological order
      const sortedMessages = [...(thread.messages || [])].sort((a, b) => {
        const tsA = parseFloat(a.ts || '0');
        const tsB = parseFloat(b.ts || '0');
        return tsA - tsB;
      });

      // Map all messages in the thread to the appropriate format
      const threadHistory = sortedMessages.map(message => {
        // Determine if message is from bot/assistant or user
        const role = message.bot_id ? 'assistant' : 'user';
        return {
          role,
          content: message.text || '',
          // Include timestamp for debugging
          ts: message.ts
        };
      });

      // Combine all messages in the correct order
      const formattedMessages = [systemMessage, ...threadHistory];

      // Log the formatted conversation for debugging
      console.log('💬 Conversation context (sorted by timestamp):', JSON.stringify(formattedMessages, null, 2));

      // Generate response with just the current message as prompt
      // Note: We're not using the mapped messages with the AI SDK due to type constraints
      const { text } = await generateText({
        model: openai('gpt-4.1-mini'),
        system: systemPrompt,
        prompt: currentUserMessage
      })

      // Set message history title
      await setTitle({ title: text })

      // Send response
      await say({ text })
    }
  })
)

// Create Slash Command
app.command('/moo-hello', async (req) => {
  return '🐮 Mooooooo from MooAI!'
})

// Create HTTP Handler
export default async function POST(req: Request): Promise<Response> {
  return await app.run(req, { waitUntil })
}
