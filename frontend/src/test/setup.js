import '@testing-library/jest-dom'

const storage = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => {
      storage[key] = String(value)
    },
    removeItem: (key) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key])
    },
  },
  configurable: true,
})
