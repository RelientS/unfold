import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Unfold · 电子手帐',
  description: '帮你在情绪模糊状态下，看见自己内心的网页日记工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500&family=ZCOOL+XiaoWei&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
