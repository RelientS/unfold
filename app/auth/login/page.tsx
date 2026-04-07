'use client'

import { useState } from 'react'
import { signInWithEmail, signInWithGoogle } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await signInWithEmail(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-card p-10 w-full max-w-sm">
        <h1 className="font-serif text-2xl text-center mb-1 tracking-widest">UNFOLD</h1>
        <p className="text-center text-sm text-ink3 mb-8">电子手帐 · 内在日记</p>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✉</div>
            <p className="text-sm text-ink2 leading-relaxed">
              登录链接已发送到<br />
              <strong className="text-ink">{email}</strong>
            </p>
            <p className="text-xs text-ink3 mt-3">点击邮件中的链接即可登录</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-colors mb-3"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {loading ? '发送中…' : '发送登录链接'}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-ink3">
                <span className="bg-surface px-2">或</span>
              </div>
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full py-3 border border-border rounded-xl text-sm text-ink2 hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
            >
              <span>🌐</span> 使用 Google 登录
            </button>
          </>
        )}
      </div>
    </div>
  )
}
