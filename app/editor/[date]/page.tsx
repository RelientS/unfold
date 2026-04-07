'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import EditorToolbar from '@/components/canvas/EditorToolbar'
import RightPanel from '@/components/canvas/RightPanel'
import LetterSealModal from '@/components/letter/LetterSealModal'
import RabbitCompanion from '@/components/rabbit/RabbitCompanion'
import TemplateGallery from '@/components/canvas/TemplateGallery'

// Dynamic import to avoid SSR issues with fabric.js
const FabricCanvas = dynamic(() => import('@/components/canvas/FabricCanvas'), { ssr: false })

interface DiaryEntry {
  id: string
  entry_date: string
  canvas_state: Record<string, unknown> | null
  mood: string | null
  weather: string | null
  template_id: string | null
}

interface PageProps {
  params: Promise<{ date: string }>
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function EditorPage({ params }: PageProps) {
  const { date } = use(params)
  const router = useRouter()

  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [showSealModal, setShowSealModal] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [canvasJson, setCanvasJson] = useState<Record<string, unknown>>({})
  const [entryId, setEntryId] = useState<string | null>(null)
  const [currentMood, setCurrentMood] = useState<string | undefined>()
  const [currentWeather, setCurrentWeather] = useState<string | undefined>()

  // Text selection state for "寄信" trigger
  const [selectedText, setSelectedText] = useState('')
  const [showTextBar, setShowTextBar] = useState(false)

  // Parse date
  const dateObj = new Date(date + 'T12:00:00')
  const dateLabel = `${dateObj.getFullYear()} 年 ${dateObj.getMonth() + 1} 月 ${dateObj.getDate()} 日`
  const dayLabel = `星期${DAYS[dateObj.getDay()]}`

  useEffect(() => {
    fetch(`/api/entries/${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.entry) {
          setEntry(d.entry)
          setEntryId(d.entry.id)
          setCurrentMood(d.entry.mood)
          setCurrentWeather(d.entry.weather)
          if (d.entry.canvas_state) setCanvasJson(d.entry.canvas_state)
          if (!d.entry.canvas_state) setShowTemplate(true)
        } else {
          setShowTemplate(true)
        }
        setLoading(false)
      })
      .catch(() => { setLoading(false); setShowTemplate(true) })
  }, [date])

  // Listen for text selection events from canvas
  useEffect(() => {
    function handleTextSelected(e: Event) {
      const text = (e as CustomEvent<{ text: string }>).detail?.text || ''
      if (text.trim()) {
        setSelectedText(text.trim().slice(0, 200))
        setShowTextBar(true)
      }
    }
    window.addEventListener('canvas:text-selected', handleTextSelected)
    return () => window.removeEventListener('canvas:text-selected', handleTextSelected)
  }, [])

  const handleCanvasChange = useCallback(async (json: Record<string, unknown>) => {
    if (!date) return
    setCanvasJson(json)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: date,
          canvas_state: json,
          mood: currentMood,
          weather: currentWeather,
          template_id: entry?.template_id || 'blank',
        }),
      })
      const data = await res.json()
      if (data.entry?.id && !entryId) setEntryId(data.entry.id)
    } catch {}
  }, [date, currentMood, currentWeather, entry?.template_id, entryId])

  const handleSticker = useCallback((emoji: string) => {
    window.dispatchEvent(new CustomEvent('canvas:add-sticker', { detail: emoji }))
    setActiveTool(null)
  }, [])

  const handleMood = useCallback(async (mood: string, emoji: string) => {
    setCurrentMood(mood)
    window.dispatchEvent(new CustomEvent('canvas:add-sticker', { detail: emoji }))
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_date: date, mood }),
    })
  }, [date])

  const handleAiGenerate = useCallback(async (keyword: string) => {
    const res = await fetch('/api/stickers/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })
    const data = await res.json()
    if (data.sticker?.image_url) {
      window.dispatchEvent(new CustomEvent('canvas:add-image', { detail: data.sticker.image_url }))
    }
  }, [])

  const handleImageUpload = useCallback((url: string) => {
    window.dispatchEvent(new CustomEvent('canvas:add-image', { detail: url }))
    setActiveTool(null)
  }, [])

  const handleTemplateSelect = useCallback((templateId: string, initialJson?: Record<string, unknown>) => {
    setShowTemplate(false)
    if (initialJson) {
      setCanvasJson(initialJson)
      window.dispatchEvent(new CustomEvent('canvas:load-json', { detail: initialJson }))
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full bg-accent animate-bounce animate-bounce-delay-${i}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center px-6 gap-4 z-10">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-1.5 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors"
        >
          ← 返回月历
        </button>
        <div className="flex-1 font-serif text-base">
          {dateLabel} <span className="text-ink3 text-sm ml-1">{dayLabel}</span>
        </div>
        <button
          onClick={() => setShowSealModal(true)}
          className="px-4 py-1.5 border border-warn/50 bg-warn/10 rounded-lg text-sm text-accent hover:bg-warn/20 transition-colors"
        >
          ✉ 写信
        </button>
      </div>

      {/* Floating text selection bar */}
      {showTextBar && selectedText && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-xl shadow-float px-4 py-2 flex items-center gap-3 max-w-md">
          <span className="text-xs text-ink2 truncate max-w-[200px]">"{selectedText.slice(0, 40)}{selectedText.length > 40 ? '…' : ''}"</span>
          <button
            onClick={() => {
              setShowSealModal(true)
              setShowTextBar(false)
            }}
            className="px-3 py-1 bg-warn text-white rounded-lg text-xs whitespace-nowrap hover:bg-warn/90 transition-colors"
          >
            ✉ 寄信
          </button>
          <button
            onClick={() => setShowTextBar(false)}
            className="text-ink3 hover:text-ink text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toolbar */}
      <EditorToolbar
        onTool={setActiveTool}
        activeTool={activeTool}
        onDelete={() => window.dispatchEvent(new CustomEvent('canvas:delete'))}
        onUndo={() => window.dispatchEvent(new CustomEvent('canvas:undo'))}
      />

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-8 pt-20 pb-8 overflow-auto bg-bg">
        <FabricCanvas
          key={date}
          initialJson={canvasJson}
          onChange={handleCanvasChange}
        />
      </div>

      {/* Right Panel */}
      <RightPanel
        panel={activeTool || ''}
        onSticker={handleSticker}
        onImageUpload={handleImageUpload}
        onMood={handleMood}
        onAiGenerate={handleAiGenerate}
        onClose={() => setActiveTool(null)}
      />

      {/* Letter Seal Modal (free-form, no entry required) */}
      {showSealModal && (
        <LetterSealModal
          open={showSealModal}
          initialContent={selectedText}
          initialTriggerTime={null}
          topic=""
          source="diary_selection"
          onClose={() => { setShowSealModal(false); setSelectedText('') }}
          onSealed={() => { setShowSealModal(false); setSelectedText('') }}
        />
      )}

      {/* Template Picker */}
      {showTemplate && (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplate(false)}
        />
      )}

      {/* Rabbit */}
      <RabbitCompanion
        mood={currentMood}
        weather={currentWeather}
        date={dateLabel}
      />
    </div>
  )
}
