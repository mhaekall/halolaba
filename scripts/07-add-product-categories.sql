-- Add category column to products table
ALTER TABLE products 
ADD COLUMN category VARCHAR(100) DEFAULT 'Lainnya';

-- Update existing products with default category
UPDATE products 
SET category = 'Lainnya' 
WHERE category IS NULL;

-- Create index for better performance on category searches
CREATE INDEX idx_products_category ON products(category);

-- Add some sample categories to existing products (optional)
UPDATE products SET category = 'Makanan & Minuman' WHERE name ILIKE '%kopi%' OR name ILIKE '%teh%' OR name ILIKE '%air%' OR name ILIKE '%susu%';
UPDATE products SET category = 'Snack & Permen' WHERE name ILIKE '%snack%' OR name ILIKE '%keripik%' OR name ILIKE '%permen%' OR name ILIKE '%coklat%';
UPDATE products SET category = 'Sembako' WHERE name ILIKE '%beras%' OR name ILIKE '%gula%' OR name ILIKE '%minyak%' OR name ILIKE '%tepung%';
UPDATE products SET category = 'Rokok & Tembakau' WHERE name ILIKE '%rokok%' OR name ILIKE '%kretek%';
