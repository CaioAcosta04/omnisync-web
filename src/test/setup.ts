import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

if (typeof window !== 'undefined' && !window.localStorage) {
  const entries = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() { return entries.size },
      clear: () => entries.clear(),
      getItem: (key: string) => entries.get(String(key)) ?? null,
      key: (index: number) => [...entries.keys()][index] ?? null,
      removeItem: (key: string) => entries.delete(String(key)),
      setItem: (key: string, value: string) => entries.set(String(key), String(value)),
    } satisfies Storage,
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  window.localStorage.clear()
})

afterAll(() => server.close())
