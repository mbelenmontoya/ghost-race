import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'"
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend'
      }
    ]
  }
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
})
