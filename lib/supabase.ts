import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Product = {
  id: string
  name: string
  stock: number
  minimal_stock: number
  cost_price: number
  selling_price: number
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  total_amount: number
  profit: number
  created_at: string
  type: string
}

export type TransactionItem = {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
}

export type Expense = {
  id: string
  description: string
  amount: number
  category: string
  expense_type: string
  expense_category: string
  created_at: string
}

export type Debt = {
  id: string
  customer_name: string
  amount: number
  status: string
  created_at: string
  paid_at: string | null
}

export type DebtItem = {
  id: string
  debt_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
}
