import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { buangSemuaDraf } from '@/lib/draf-form'

// Isian form yang belum disimpan hidup di memori modul (lib/draf-form.ts); kosongkan agar tes tidak saling mewarisi isian.
beforeEach(() => buangSemuaDraf())
