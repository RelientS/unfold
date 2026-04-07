'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/supabase/client'
import MonthCalendar from '@/components/calendar/MonthCalendar'
import RabbitCompanion from '@/components/rabbit/RabbitCompanion'
import LetterNotification from '@/components/letter/LetterNotification'

export default function HomePage() {
  const router = useRouter()
  const [session, setSession] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full bg-accent animate-bounce animate-bounce-delay-${i}`}
            />
          ))}
        </div>
      </div>
    )
  }

  // In production, redirect to auth if not logged in
  // For now show the calendar directly
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      {/* Main calendar */}
      <main className="flex-1 overflow-hidden">
        <MonthCalendar />
      </main>
      {/* Rabbit companion */}
      <RabbitCompanion />
      {/* Letter due notification */}
      <LetterNotification />
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="w-16 bg-surface border-r border-border flex flex-col items-center py-5 gap-2 flex-shrink-0">
      <button
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-ink2 hover:bg-bg transition-colors"
        title="月历"
      >
        ◫
      </button>
      <button
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-ink2 hover:bg-bg transition-colors"
        title="今日画布"
        onClick={() => {
          const today = new Date().toISOString().slice(0, 10)
          window.location.href = `/editor/${today}`
        }}
      >
        ✎
      </button>
      <div className="mt-auto font-serif text-xs text-ink3 tracking-widest [writing-mode:vertical-rl]">
        UNFOLD
      </div>
    </aside>
  )
}
