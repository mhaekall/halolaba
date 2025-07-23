-- Remove restock from expenses (it should be asset, not expense)
-- Only keep operational expenses like electricity
DELETE FROM expenses WHERE expense_type = 'restock';

-- Add purchase_transactions table for tracking stock purchases (asset)
CREATE TABLE IF NOT EXISTS purchase_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount DECIMAL(10,2) NOT NULL,
  supplier_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add purchase_items table for detailed purchase records
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_transaction_id UUID REFERENCES purchase_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_purchase_transactions_created_at ON purchase_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);
