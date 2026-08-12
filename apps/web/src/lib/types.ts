export type Role = 'devotee' | 'admin'

export interface DemoUser {
  id: string
  name: string
  role: Role
}

export interface PrasadamItem {
  id: string
  name: string
  description: string
  displayPrice: string
  stock: number
  reorderLevel: number
  active: boolean
  createdAt: string
  lowStock: boolean
  reservable: boolean
}

export interface PrasadamInput {
  name: string
  description: string
  displayPrice: string
  stock?: number
  reorderLevel: number
  active: boolean
}

export interface StockAdjustmentInput {
  delta: number
  reason: string
}
