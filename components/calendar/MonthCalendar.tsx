'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const DOWS = ['日', '一', '二', '三', '四', '五', '六']

const WEATHER_MOOD = {
  sunny: '☀️', cloudy: '⛅', rainy: '🌧️', snowy: '🌨️',
  serene: '😌', joyful: '😊', heavy: '😔', anxious: '😰', tender: '🥰',
}

interface Entry {
  id: string
  entry_date: string
  mood: string
  weather: string
  thumbnail_url: string | null
  is_sealed: boolean
  template_id: string
}

export default function MonthCalendar() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/entries?year=${year}&month=${month + 1}`)
      .then((r) => r.json())
      .then((d) => { setEntries(d.entries || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }
  function goToday() {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
  }

  const padBefore = Array.from({ length: firstDay }, (_, i) => (
    <div key={`empty-${i}`} className="h-20" />
  ))

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const entry = entries.find((e) => e.entry_date === dateStr)
    const isToday = new Date(year, month, d).getTime() === today.getTime()

    return (
      <CalendarCell
        key={dateStr}
        date={dateStr}
        day={d}
        entry={entry}
        isToday={isToday}
        onClick={() => router.push(`/editor/${dateStr}`)}
      />
    )
  })

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-normal tracking-widest text-ink">
          {year} 年 {month + 1} 月
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-4 py-2 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors">
            ◀
          </button>
          <button onClick={goToday} className="px-4 py-2 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors">
            今天
          </button>
          <button onClick={nextMonth} className="px-4 py-2 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors">
            ▶
          </button>
        </div>
      </div>

      {/* DOW labels */}
      <div className="grid grid-cols-7 gap-3">
        {DOWS.map((d) => (
          <div key={d} className="text-center text-xs text-ink3 tracking-widest pb-2 border-b border-border">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3 flex-1">
        {padBefore}
        {days}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-bg/60 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full bg-accent animate-bounce animate-bounce-delay-${i}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarCell({
  date, day, entry, isToday, onClick,
}: {
  date: string
  day: number
  entry?: Entry
  isToday: boolean
  onClick: () => void
}) {
  const emoji = entry?.mood ? WEATHER_MOOD[entry.mood as keyof typeof WEATHER_MOOD] : null

  return (
    <button
      onClick={onClick}
      className={`
        h-20 rounded-xl border flex flex-col items-center justify-center gap-1
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card cursor-pointer
        ${isToday ? 'border-accent border-2' : 'border-transparent hover:border-border'}
        ${entry ? 'bg-surface' : 'bg-transparent'}
      `}
    >
      <span className={`text-sm ${isToday ? 'text-accent font-medium' : 'text-ink'}`}>
        {day}
      </span>
      {entry && (
        <div className="flex items-center gap-1">
          {emoji && <span className="text-base">{emoji}</span>}
          {entry.is_sealed && <span className="text-xs">✉</span>}
        </div>
      )}
    </button>
  )
}
