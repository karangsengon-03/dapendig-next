import { useSyncExternalStore } from 'react'

// Batas yang sama dengan CSS kerangka: di atas 900px sidebar tampil tetap (bisa dilipat),
// di bawahnya menjadi drawer (hamburger).
const QUERY = '(min-width: 901px)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true
  )
}
