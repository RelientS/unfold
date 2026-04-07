'use client'

import { useState } from 'react'

interface ToolbarProps {
  onTool: (tool: string) => void
  activeTool: string | null
  onDelete: () => void
  onUndo: () => void
}

export default function EditorToolbar({ onTool, activeTool, onDelete, onUndo }: ToolbarProps) {
  const tools = [
    { id: 'text', icon: 'Aa', label: '文字' },
    { id: 'image', icon: '🖼', label: '图片' },
    { id: 'sticker', icon: '⭐', label: '贴纸' },
    { id: 'ai', icon: '✨', label: 'AI贴纸' },
    { id: 'weather', icon: '🌤', label: '天气心情' },
    { id: 'bg', icon: '🎨', label: '背景' },
    { id: 'font', icon: '✏', label: '字体' },
  ]

  return (
    <div className="w-14 bg-surface border-r border-border flex flex-col items-center py-3 gap-1.5">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onTool(activeTool === tool.id ? '' : tool.id)}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-lg
            transition-all duration-150
            ${activeTool === tool.id
              ? 'bg-accent text-white'
              : 'text-ink2 hover:bg-bg hover:text-ink'}
          `}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={onDelete}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg text-ink2 hover:bg-bg hover:text-ink transition-all"
        title="删除"
      >
        🗑
      </button>
      <button
        onClick={onUndo}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg text-ink2 hover:bg-bg hover:text-ink transition-all"
        title="撤销"
      >
        ↩
      </button>
    </div>
  )
}
