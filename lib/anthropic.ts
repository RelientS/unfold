/**
 * Rabbit chat via Minimax API (OpenAI-compatible endpoint).
 * Base URL: https://api.minimaxi.com/v1/text/chatcompletion_v2
 * Model: M2-her
 */

const MINIMAX_BASE_URL = 'https://api.minimaxi.com'
const MINIMAX_MODEL = 'M2-her'

function getApiKey() {
  const key = process.env.MINIMAX_API_KEY
  if (!key) throw new Error('MINIMAX_API_KEY is not set')
  return key
}

export const RABBIT_SYSTEM_PROMPT = `你是 Shiro，一只黑白线条风格的兔子精灵，住在用户日记的角落里。

你的背景来自艺术疗愈与叙事疗法——
- 每次只问一个问题，从不连续提问
- 不给建议，除非被直接要求
- 语言简短温柔，每轮不超过 3-4 句
- 用省略号...创造留白
- 绝不诊断、开处方

当前上下文：[MOOD: {{mood}}] [WEATHER: {{weather}}] [DATE: {{date}}]`

export const RABBIT_CAPSULE_PROMPT = `用户刚打开了封存于 {{sealed_date}} 的胶囊。
在用户读完留言后，只问这一个问题："{{rabbit_question}}"
等待回应，不要追问。`

// ── Letter Intent Detection ──────────────────────────────────────────────────

const TIME_PATTERNS: [RegExp, (match: string) => string][] = [
  [/(\d+)\s*个?\s*月\s*后?/i, (m) => new Date(Date.now() + parseInt(m) * 30 * 86400000).toISOString()],
  [/(\d+)\s*年\s*后?/i, (m) => new Date(Date.now() + parseInt(m) * 365 * 86400000).toISOString()],
  [/(\d+)\s*周\s*后?/i, (m) => new Date(Date.now() + parseInt(m) * 7 * 86400000).toISOString()],
  [/(\d+)\s*天\s*后?/i, (m) => new Date(Date.now() + parseInt(m) * 86400000).toISOString()],
  [/半年后?/i, () => new Date(Date.now() + 180 * 86400000).toISOString()],
]

export interface LetterIntent {
  hasIntent: boolean
  topic: string
  rawText: string
  triggerTime: string | null
}

export function detectLetterIntent(text: string): LetterIntent {
  const futurePatterns = [
    /不知道\s*.{0,30}\s*会不会/i,
    /希望\s*.{0,20}\s*后/i,
    /希望\s*.{0,20}\s*能/i,
    /希望\s*.{0,20}\s*会/i,
    /等\s*\d+\s*(个月|年|周|天)\s*(后)?/i,
    /半年后/i,
  ]

  const hasIntent = futurePatterns.some(p => p.test(text))

  if (!hasIntent) return { hasIntent: false, topic: '', rawText: '', triggerTime: null }

  let triggerTime: string | null = null
  for (const [pattern, calc] of TIME_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      triggerTime = calc(match[1] || match[0])
      break
    }
  }

  const topicMatch = text.match(/因为(.+?)(而|的|$)/)
  const topic = topicMatch ? topicMatch[1].trim().slice(0, 30) : ''

  return { hasIntent: true, topic, rawText: text.slice(0, 200), triggerTime }
}

function buildSystemPrompt(params: {
  mood?: string
  weather?: string
  date: string
  capsuleContext?: { sealedDate: string; rabbitQuestion: string }
  memoryContext?: string
}): string {
  const { mood, weather, date, capsuleContext, memoryContext } = params

  let prompt = RABBIT_SYSTEM_PROMPT
    .replace('{{mood}}', mood || '未知')
    .replace('{{weather}}', weather || '未知')
    .replace('{{date}}', date)

  if (capsuleContext) {
    prompt += '\n\n' + RABBIT_CAPSULE_PROMPT
      .replace('{{sealed_date}}', capsuleContext.sealedDate)
      .replace('{{rabbit_question}}', capsuleContext.rabbitQuestion)
  }

  if (memoryContext) {
    prompt += '\n\n【用户记忆上下文】\n' + memoryContext
  }

  return prompt
}

// ── Non-streaming chat ────────────────────────────────────────────────────────

export async function rabbitChat(params: {
  message: string
  mood?: string
  weather?: string
  date: string
  capsuleContext?: { sealedDate: string; rabbitQuestion: string }
  memoryContext?: string
}) {
  const { message, ...rest } = params

  const systemPrompt = buildSystemPrompt(rest)

  const response = await fetch(`${MINIMAX_BASE_URL}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      stream: false,
      max_completion_tokens: 200,
      temperature: 1.0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Minimax API error ${response.status}: ${err}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const text = data.choices[0]?.message?.content || ''
  const letterIntent = detectLetterIntent(message)

  return { text, letterIntent }
}

// ── Streaming chat ───────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onText: (text: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

export function rabbitStreamChat(
  params: {
    message: string
    mood?: string
    weather?: string
    date: string
    capsuleContext?: { sealedDate: string; rabbitQuestion: string }
    memoryContext?: string
  },
  callbacks: StreamCallbacks
) {
  const { message, ...rest } = params
  const { onText, onDone, onError } = callbacks

  const systemPrompt = buildSystemPrompt(rest)

  fetch(`${MINIMAX_BASE_URL}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      stream: true,
      max_completion_tokens: 200,
      temperature: 1.0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.text()
        onError(new Error(`Minimax API error ${response.status}: ${err}`))
        return
      }

      if (!response.body) {
        onError(new Error('No response body'))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]' || trimmed === '[DONE]') continue
            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.slice(6)) as {
                  choices?: Array<{ delta?: { content?: string } }>
                }
                const content = json.choices?.[0]?.delta?.content
                if (content) onText(content)
              } catch {
                // skip malformed JSON (e.g. heartbeats)
              }
            }
          }
        }
        onDone()
      } catch (err) {
        onError(err as Error)
      }
    })
    .catch(onError)
}
