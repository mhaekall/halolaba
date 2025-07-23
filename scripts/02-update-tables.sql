-- Add minimal_stock column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimal_stock INTEGER DEFAULT 5;

-- Update expenses table to be more specific
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50) DEFAULT 'operational';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_minimal_stock ON products(minimal_stock);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_product_id ON expenses(product_id);
