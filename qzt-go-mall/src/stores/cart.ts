import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MallGoods } from '../types/mall'

export interface CartItem {
  id: number
  name: string
  price: string
  image: string
  unit: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  add: (goods: MallGoods, quantity: number) => void
  setQuantity: (id: number, quantity: number) => void
  remove: (id: number) => void
  clear: () => void
}

/** 轻量购物车(localStorage 持久化,免登录商城) */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (goods, quantity) =>
        set((s) => {
          const idx = s.items.findIndex((i) => i.id === goods.id)
          if (idx >= 0) {
            const items = [...s.items]
            items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity }
            return { items }
          }
          return {
            items: [
              ...s.items,
              {
                id: goods.id,
                name: goods.name,
                price: goods.standard_price,
                image: goods.image_url,
                unit: goods.unit,
                quantity,
              },
            ],
          }
        }),
      setQuantity: (id, quantity) =>
        set((s) => ({
          items: quantity <= 0 ? s.items.filter((i) => i.id !== id) : s.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'qzt-mall:cart' },
  ),
)

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0)
export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
