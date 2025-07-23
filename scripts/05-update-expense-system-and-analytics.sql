-- Create separate tables for operational expenses and restock
CREATE TABLE IF NOT EXISTS operational_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restock table with HPP tracking
CREATE TABLE IF NOT EXISTS restock_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount DECIMAL(10,2) NOT NULL,
  supplier_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restock items table for detailed tracking
CREATE TABLE IF NOT EXISTS restock_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restock_id UUID REFERENCES restock_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'low_stock', 'debt_due', 'sales_target', etc.
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID, -- Can reference product_id, debt_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table for caching analytics data
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Migrate data from expenses table to new tables
INSERT INTO operational_expenses (description, amount, category, created_at)
SELECT description, amount, category, created_at
FROM expenses
WHERE expense_category = 'operational';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_operational_expenses_category ON operational_expenses(category);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_created_at ON operational_expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_restock_transactions_created_at ON restock_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_restock_items_product_id ON restock_items(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
