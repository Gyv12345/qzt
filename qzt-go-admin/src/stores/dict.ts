import { create } from 'zustand'
import type { SysDict } from '../types'
import { listAllDicts } from '../services/system'

interface DictState {
  dicts: SysDict[]
  loaded: boolean
  load: () => Promise<void>
  /** 字典选项 */
  options: (code: string) => { label: string; value: string }[]
  /** 值 -> 显示名 */
  label: (code: string, value: string | number | null | undefined) => string
}

export const useDictStore = create<DictState>()((set, get) => ({
  dicts: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const dicts = await listAllDicts()
    set({ dicts: dicts ?? [], loaded: true })
  },

  options: (code) => {
    const dict = get().dicts.find((d) => d.code === code)
    return (dict?.items ?? [])
      .filter((i) => i.status === 1)
      .sort((a, b) => a.sort - b.sort)
      .map((i) => ({ label: i.label, value: i.value }))
  },

  label: (code, value) => {
    if (value === null || value === undefined || value === '') return '-'
    const dict = get().dicts.find((d) => d.code === code)
    const item = dict?.items?.find((i) => i.value === String(value))
    return item?.label ?? String(value)
  },
}))

/** 字典选项 hook(需确保 dict store 已加载) */
export function useDictOptions(code: string) {
  return useDictStore((s) => s.options)(code)
}

/** 字典显示名 hook */
export function useDictLabel(code: string, value: string | number | null | undefined) {
  return useDictStore((s) => s.label)(code, value)
}
