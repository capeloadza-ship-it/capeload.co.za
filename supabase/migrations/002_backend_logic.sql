-- CapeLoad Backend Logic Migration
-- Adds: vehicle availability, driver status workflow, payments, proof of delivery

-- ═══════════════════════════════════════
-- VEHICLES: Add availability_status (replaces boolean available)
-- ═══════════════════════════════════════
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'unavailable'
  CHECK (availability_status IN ('available', 'unavailable', 'maintenance'));

-- Migrate existing boolean to new column
UPDATE public.vehicles SET availability_status = 'available' WHERE available = true;
UPDATE public.vehicles SET availability_status = 'unavailable' WHERE available = false OR available IS NULL;

-- Update status check to include in_use
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_status_check
  CHECK (status IN ('pending', 'approved', 'suspended', 'in_use'));

-- ═══════════════════════════════════════
-- BOOKINGS: Add driver workflow + timestamps
-- ═══════════════════════════════════════
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS driver_status TEXT DEFAULT 'pending'
  CHECK (driver_status IN ('pending', 'accepted', 'on_the_way', 'picked_up', 'delivered', 'declined'));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS proof_of_delivery_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- ═══════════════════════════════════════
-- PAYMENTS TABLE (NEW)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('eft', 'card', 'ozow', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients read own payments" ON public.payments
  FOR SELECT USING (
    booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
  );

CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "System insert payments" ON public.payments
  FOR INSERT WITH CHECK (true);

-- Enable realtime on payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- ═══════════════════════════════════════
-- USERS: Add phone_verified
-- ═══════════════════════════════════════
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════
-- FUNCTION: Auto-release vehicle on job completion
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_booking_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes to 'completed' or 'cancelled', release the vehicle
  IF (NEW.status IN ('completed', 'cancelled')) AND OLD.status NOT IN ('completed', 'cancelled') THEN
    IF NEW.vehicle_id IS NOT NULL THEN
      UPDATE public.vehicles
      SET availability_status = 'available'
      WHERE id = NEW.vehicle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
CREATE TRIGGER on_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_completed();

-- ═══════════════════════════════════════
-- FUNCTION: Auto-lock vehicle on assignment
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_booking_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- When a vehicle is assigned to a booking, mark it unavailable
  IF NEW.vehicle_id IS NOT NULL AND (OLD.vehicle_id IS NULL OR OLD.vehicle_id != NEW.vehicle_id) THEN
    UPDATE public.vehicles
    SET availability_status = 'unavailable'
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_assigned ON public.bookings;
CREATE TRIGGER on_booking_assigned
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_assigned();
