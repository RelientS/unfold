'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Letter {
  id: string
  content: string
  topic: string | null
  trigger_source: string
  trigger_time: string
  status: string
}

export default function LetterNotification() {
  const router = useRouter()
  const [letters, setLetters] = useState<Letter[]>([])
  const [showUnseal, setShowUnseal] = useState<Letter | null>(null)

  useEffect(() => {
    fetch('/api/letters/due')
      .then((r) => r.json())
      .then((d) => {
        if (d.letters?.length > 0) setLetters(d.letters)
      })
      .catch(() => {})
  }, [])

  if (letters.length === 0) return null

  const current = showUnseal || letters[0]
  if (!current) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-0 z-[600] bg-bg flex flex-col items-center justify-center p-8"
      >
        {/* Envelope animation */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-6xl mb-6"
        >
          ✉
        </motion.div>

        <div className="text-xs font-medium text-ink3 tracking-widest uppercase mb-4">
          来自过去的信
        </div>

        {current.topic && (
          <div className="text-xs text-accent mb-2 tracking-widest uppercase">主题：{current.topic}</div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface rounded-2xl px-8 py-6 shadow-card text-center max-w-md mb-5"
        >
          <p className="font-serif text-base leading-relaxed whitespace-pre-wrap text-ink">
            {current.content}
          </p>
        </motion.div>

        <div className="text-xs text-ink3 mb-6">
          收信时间：{new Date(current.trigger_time).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        <div className="flex gap-3">
          {letters.length > 1 && (
            <button
              onClick={() => {
                const idx = letters.indexOf(current)
                setShowUnseal(letters[idx + 1] || letters[0])
              }}
              className="px-4 py-2 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors"
            >
              还有 {letters.length - 1} 封 →
            </button>
          )}
          <button
            onClick={async () => {
              await fetch(`/api/letters/${current.id}/open`, { method: 'POST' })
              router.push(`/editor/${new Date().toISOString().slice(0, 10)}`)
            }}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
          >
            打开画布，继续写
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
