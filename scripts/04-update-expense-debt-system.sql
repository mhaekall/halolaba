-- Update expenses table to support both restock and operational costs
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_category VARCHAR(100);

-- Update existing expenses to have proper categories
UPDATE expenses SET expense_category = 'restock' WHERE expense_type = 'restock';
UPDATE expenses SET expense_category = 'operational' WHERE expense_type = 'operational';

-- Add debt_items table to track which products are in debt
CREATE TABLE IF NOT EXISTS debt_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- Remove description from debts (will be auto-generated from products)
ALTER TABLE debts DROP COLUMN IF EXISTS description;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_debt_items_debt_id ON debt_items(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_items_product_id ON debt_items(product_id);
