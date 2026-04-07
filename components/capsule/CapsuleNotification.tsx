'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Capsule {
  id: string
  note_to_future_self: string | null
  rabbit_question: string | null
  unlock_at: string
  status: string
  entry: {
    id: string
    entry_date: string
    mood: string | null
    weather: string | null
  } | null
}

export default function CapsuleNotification() {
  const router = useRouter()
  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [showUnseal, setShowUnseal] = useState<Capsule | null>(null)

  useEffect(() => {
    // Fetch due capsules
    fetch('/api/capsules')
      .then((r) => r.json())
      .then((d) => {
        const due = (d.capsules || []).filter(
          (c: Capsule) => c.status === 'sealed' && new Date(c.unlock_at) <= new Date()
        )
        if (due.length > 0) {
          setShowUnseal(due[0])
        }
      })
      .catch(() => {})
  }, [])

  if (!showUnseal) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[600] bg-bg flex flex-col items-center justify-center p-8"
      >
        {/* Envelope */}
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

        {/* Note */}
        {showUnseal.note_to_future_self && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-surface rounded-2xl px-8 py-6 shadow-card text-center max-w-md mb-5"
          >
            <p className="font-serif text-base leading-relaxed whitespace-pre-wrap text-ink">
              {showUnseal.note_to_future_self}
            </p>
          </motion.div>
        )}

        {/* Rabbit question */}
        {showUnseal.rabbit_question && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-accent text-white rounded-2xl px-6 py-5 max-w-md mb-6"
          >
            <div className="text-xs font-medium opacity-70 mb-2 tracking-widest uppercase">🐰 兔子的问题</div>
            <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
              {showUnseal.rabbit_question}
            </p>
          </motion.div>
        )}

        <button
          onClick={async () => {
            // Open capsule via API
            await fetch(`/api/capsules/${showUnseal.id}/open`, { method: 'POST' })
            setShowUnseal(null)
            // Navigate to the entry
            if (showUnseal.entry) {
              router.push(`/editor/${showUnseal.entry.entry_date}`)
            }
          }}
          className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
        >
          打开画布，继续写
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
