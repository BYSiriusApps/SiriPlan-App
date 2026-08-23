-- Migration: Inventory items and transactions table
-- Supports stock tracking for salons, barbers, beauty centers etc.

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'genel',
  unit TEXT DEFAULT 'adet',
  current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_stock_alert NUMERIC(10,2) DEFAULT 5,
  cost_price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2),
  note TEXT,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_member" ON inventory_items
  FOR ALL USING (is_org_member(org_id));

CREATE POLICY "inventory_transactions_member" ON inventory_transactions
  FOR ALL USING (is_org_member(org_id));

-- Trigger to auto-update current_stock on transaction insert
CREATE OR REPLACE FUNCTION update_inventory_stock_on_tx()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE inventory_items SET current_stock = current_stock + NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.type = 'out' THEN
    UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - NEW.quantity), updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.type = 'adjust' THEN
    UPDATE inventory_items SET current_stock = NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_inventory_stock_tx ON inventory_transactions;
CREATE TRIGGER tr_inventory_stock_tx
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION update_inventory_stock_on_tx();

NOTIFY pgrst, 'reload schema';
