'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LetterSealModal from '@/components/letter/LetterSealModal'

interface LetterIntent {
  hasIntent: boolean
  topic: string
  rawText: string
  triggerTime: string | null
}

interface RabbitCompanionProps {
  mood?: string
  weather?: string
  date?: string
  capsuleContext?: { sealedDate: string; rabbitQuestion: string }
}

export default function RabbitCompanion({
  mood, weather, date, capsuleContext,
}: RabbitCompanionProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: '你好，我在这里。今天想聊什么？' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [letterIntent, setLetterIntent] = useState<LetterIntent | null>(null)
  const [showSealModal, setShowSealModal] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)
    setLetterIntent(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mood, weather, date, capsule_context: capsuleContext }),
      })

      if (!res.ok) throw new Error('Chat failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'letter_intent') {
                  setLetterIntent(data)
                }
                if (data.text) assistantMessage += data.text
                if (data.done) break
              } catch {}
            }
          }
        }
      }

      if (assistantMessage) {
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }])
        // Show seal prompt if letter intent was detected
        if (letterIntent?.hasIntent) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `……我注意到你提到了关于未来的想法。你想把这句话封存起来，等 ${formatTime(letterIntent.triggerTime)} 后再收到吗？`
          }])
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '……嗯，我在听。' }])
    } finally {
      setLoading(false)
    }
  }

  function formatTime(iso: string | null): string {
    if (!iso) return '一段时间后'
    const d = new Date(iso)
    const diff = Math.round((d.getTime() - Date.now()) / 86400000)
    if (diff <= 0) return '现在'
    if (diff < 30) return `${diff}天后`
    if (diff < 365) return `${Math.round(diff / 30)}个月后`
    return `${Math.round(diff / 365)}年后`
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Chat bubble */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-72 max-h-80 bg-surface border border-border rounded-2xl shadow-float flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-bg">
                <span className="text-lg">🐰</span>
                <div>
                  <div className="text-sm font-medium text-ink">Shiro</div>
                  <div className="text-xs text-ink3">兔子精灵</div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto text-ink3 hover:text-ink text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-bg border border-border text-ink rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {letterIntent?.hasIntent && (
                  <div className="flex justify-start">
                    <button
                      onClick={() => { setShowSealModal(true); setOpen(false) }}
                      className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm text-sm bg-warn/20 border border-warn/40 text-ink flex items-center gap-1.5 hover:bg-warn/30 transition-colors"
                    >
                      ✉ 要封存这封信吗？
                    </button>
                  </div>
                )}
                {loading && (
                  <div className="flex gap-1 px-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full bg-accent animate-bounce animate-bounce-delay-${i}`} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="说说你的感受……"
                  className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="px-3 py-2 bg-accent text-white rounded-xl text-sm disabled:opacity-50 hover:bg-accent/90 transition-colors"
                >
                  发送
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle bunny */}
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 rounded-full bg-surface border-2 border-ink shadow-card flex items-center justify-center text-2xl hover:scale-110 transition-transform"
          title="兔子精灵 Shiro"
        >
          🐰
        </button>
      </div>

      {/* Seal Modal */}
      <LetterSealModal
        open={showSealModal}
        initialContent={letterIntent?.rawText || ''}
        initialTriggerTime={letterIntent?.triggerTime || null}
        topic={letterIntent?.topic || ''}
        source="rabbit"
        onClose={() => setShowSealModal(false)}
        onSealed={() => setLetterIntent(null)}
      />
    </>
  )
}
