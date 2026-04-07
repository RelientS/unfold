'use client'

import { useEffect, useRef, useCallback } from 'react'
import { fabric } from 'fabric'

interface FabricCanvasProps {
  initialJson?: Record<string, unknown>
  onChange?: (json: Record<string, unknown>) => void
  width?: number
  height?: number
  backgroundColor?: string
}

export default function FabricCanvas({
  initialJson,
  onChange,
  width = 640,
  height = 900,
  backgroundColor = '#fefefe',
}: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Initialize Fabric.js
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
    })

    fabricRef.current = canvas

    // Load initial state
    if (initialJson) {
      canvas.loadFromJSON(initialJson, () => {
        canvas.renderAll()
      })
    }

    // Debounced save on changes
    function scheduleSave() {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        if (onChange) onChange(canvas.toJSON())
      }, 2000)
    }

    canvas.on('object:added', scheduleSave)
    canvas.on('object:modified', scheduleSave)
    canvas.on('object:removed', scheduleSave)

    // Text selection detection → dispatch custom event for letter trigger
    canvas.on('text:selection:changed', () => {
      const active = canvas.getActiveObject()
      if (active && (active as fabric.IText).type === 'i-text') {
        const selectedText = (active as fabric.IText).text?.trim() || ''
        if (selectedText) {
          window.dispatchEvent(new CustomEvent('canvas:text-selected', {
            detail: { text: selectedText }
          }))
        }
      }
    })

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      canvas.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Expose methods via ref patterns if needed
  const addText = useCallback((text: string, options?: Record<string, unknown>) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const itext = new fabric.IText(text, {
      left: 120,
      top: 200,
      fontFamily: 'ZCOOL XiaoWei, Noto Serif SC',
      fontSize: 18,
      fill: '#2c2825',
      width: 200,
      ...options,
    })
    canvas.add(itext)
    canvas.setActiveObject(itext)
    itext.enterEditing()
    canvas.renderAll()
  }, [])

  const addSticker = useCallback((emoji: string, options?: Record<string, unknown>) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const text = new fabric.Text(emoji, {
      left: 100,
      top: 200,
      fontSize: 40,
      ...options,
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }, [])

  const addImage = useCallback((url: string, options?: Record<string, unknown>) => {
    const canvas = fabricRef.current
    if (!canvas) return
    fabric.Image.fromURL(url, (img) => {
      if (!img) return
      img.set({ left: 80, top: 80, ...options })
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
    })
  }, [])

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    if (active.length) {
      active.forEach((obj) => canvas.remove(obj))
      canvas.discardActiveObject()
      canvas.renderAll()
    }
  }, [])

  const undo = useCallback(() => {
    // Basic undo: reload from saved snapshot (Fabric history extension preferred)
    console.warn('undo: implement with fabric.history extension')
  }, [])

  // Handle beforeunload
  useEffect(() => {
    function handleBeforeUnload() {
      if (onChange && fabricRef.current) {
        const data = JSON.stringify(fabricRef.current.toJSON())
        navigator.sendBeacon('/api/entries', data)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [onChange])

  return (
    <div className="relative shadow-card rounded">
      <canvas ref={canvasRef} />
    </div>
  )
}
