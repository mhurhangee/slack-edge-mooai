// api/slack.ts
import { SlackApp, Assistant } from 'slack-edge'
import { waitUntil } from '@vercel/functions'

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
      await say({ text: 'Hi, how can I help you today?' })
      await setSuggestedPrompts({
        prompts: ['What does SLACK stand for?']
      })
    },
    userMessage: async ({ context: { setStatus, say } }) => {
      await setStatus({ status: 'is typing...' })
      await say({ text: 'Here you are!' })
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
