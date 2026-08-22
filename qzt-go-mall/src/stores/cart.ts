import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MallGoods, MallSku } from '../types/mall'

export interface CartItem {
  /** SKU ID(购物车条目唯一键;单规格商品为其默认规格 SKU) */
  skuId: number
  productId: number
  name: string
  /** 规格描述(空 = 默认规格) */
  spec: string
  price: string
  image: string
  unit: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  add: (goods: MallGoods, sku: MallSku, quantity: number) => void
  setQuantity: (skuId: number, quantity: number) => void
  remove: (skuId: number) => void
  clear: () => void
}

/** 轻量购物车(localStorage 持久化,免登录商城)。条目按 SKU 区分(同商品不同规格各占一行) */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (goods, sku, quantity) =>
        set((s) => {
          const idx = s.items.findIndex((i) => i.skuId === sku.id)
          if (idx >= 0) {
            const items = [...s.items]
            items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity }
            return { items }
          }
          return {
            items: [
              ...s.items,
              {
                skuId: sku.id,
                productId: goods.id,
                name: goods.name,
                spec: sku.spec,
                price: sku.price,
                image: sku.image_url || goods.image_url,
                unit: goods.unit,
                quantity,
              },
            ],
          }
        }),
      setQuantity: (skuId, quantity) =>
        set((s) => ({
          items: quantity <= 0 ? s.items.filter((i) => i.skuId !== skuId) : s.items.map((i) => (i.skuId === skuId ? { ...i, quantity } : i)),
        })),
      remove: (skuId) => set((s) => ({ items: s.items.filter((i) => i.skuId !== skuId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'qzt-mall:cart',
      // v2:条目主键从商品 id 改为 SKU id,旧缓存直接丢弃(免登录场景成本低)
      version: 2,
      migrate: () => ({ items: [] }),
    },
  ),
)

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0)
export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
