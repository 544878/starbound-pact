import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['three'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
