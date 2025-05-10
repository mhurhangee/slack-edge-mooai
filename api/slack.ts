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
    SLACK_LOGGING_LEVEL: 'DEBUG'
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
      const { messages } = await client.conversations.replies({
        channel: payload.channel,
        ts: payload.ts,
        oldest: payload.ts,
        limit: 10
      })

      console.log(messages)

      // Generate response
      const { text } = await generateText({
        model: openai('gpt-4.1-mini'),
        system: '- You are a helpful assistant who is an expert on the environment, climate change and regenerative agriculture.\n- Format your responses with markdown and emojis.',
        prompt: payload.text
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
