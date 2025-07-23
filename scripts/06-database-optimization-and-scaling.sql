-- ===================================
-- DATABASE OPTIMIZATION & SCALING
-- ===================================

-- 1. Add user management for multi-tenant support
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'owner', -- owner, manager, cashier
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add stores table for multi-store support
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_plan VARCHAR(50) DEFAULT 'basic', -- basic, premium, enterprise
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add store_id to existing tables for multi-tenant
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE operational_expenses ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE restock_transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- 4. Add categories table for better product organization
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- hex color
  icon VARCHAR(50) DEFAULT 'package',
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add category to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 6. Add suppliers table for better supplier management
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Add supplier to restock transactions
ALTER TABLE restock_transactions ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- 8. Add customers table for better customer management
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  total_purchases DECIMAL(10,2) DEFAULT 0,
  total_debts DECIMAL(10,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Add customer to transactions and debts
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 10. Add payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- Cash, Card, Transfer, E-wallet
  is_active BOOLEAN DEFAULT TRUE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE
);

-- 11. Add payment method to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

-- 12. Add promotions/discounts table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- percentage, fixed_amount, buy_x_get_y
  value DECIMAL(10,2) NOT NULL,
  min_purchase DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Add audit log for important actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Add business settings table
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, setting_key)
);

-- 15. Add performance indexes for scaling
CREATE INDEX IF NOT EXISTS idx_products_store_category ON products(store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_store_date ON transactions(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_debts_store_status ON debts(store_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_store_active ON customers(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_date ON audit_logs(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_store_read ON notifications(store_id, is_read);

-- 16. Add RLS (Row Level Security) policies for multi-tenant
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (would need to be customized based on auth system)
-- CREATE POLICY "Users can only access their store data" ON products
--   FOR ALL USING (store_id IN (
--     SELECT store_id FROM users WHERE id = auth.uid()
--   ));

-- 17. Insert default data for existing single store setup
INSERT INTO stores (id, name, owner_id, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Warung Utama', NULL, TRUE)
ON CONFLICT DO NOTHING;

-- Update existing data to reference the default store
UPDATE products SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;
UPDATE transactions SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;
UPDATE debts SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;
UPDATE operational_expenses SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;
UPDATE restock_transactions SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;
UPDATE notifications SET store_id = '00000000-0000-0000-0000-000000000001' WHERE store_id IS NULL;

-- 18. Insert default categories
INSERT INTO categories (name, description, color, icon, store_id) VALUES
('Makanan', 'Produk makanan dan snack', '#F59E0B', 'utensils', '00000000-0000-0000-0000-000000000001'),
('Minuman', 'Minuman dan beverage', '#3B82F6', 'coffee', '00000000-0000-0000-0000-000000000001'),
('Sembako', 'Kebutuhan pokok sehari-hari', '#10B981', 'shopping-bag', '00000000-0000-0000-0000-000000000001'),
('Rokok', 'Produk tembakau', '#EF4444', 'cigarette', '00000000-0000-0000-0000-000000000001'),
('Lainnya', 'Produk lain-lain', '#6B7280', 'package', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- 19. Insert default payment methods
INSERT INTO payment_methods (name, store_id) VALUES
('Tunai', '00000000-0000-0000-0000-000000000001'),
('Transfer Bank', '00000000-0000-0000-0000-000000000001'),
('E-Wallet', '00000000-0000-0000-0000-000000000001'),
('Kartu Debit', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
