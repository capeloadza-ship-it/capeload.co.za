-- CapeLoad Logistics — Full Database Schema
-- Project: kudjacibkfztvdvwunuh

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('guest', 'client', 'driver', 'admin', 'super_admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create user row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all users" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  id_number TEXT,
  licence_number TEXT,
  licence_doc_url TEXT,
  area TEXT DEFAULT 'Cape Town Metro',
  long_distance BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  rating NUMERIC(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can read own profile" ON public.drivers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Drivers can update own profile" ON public.drivers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert driver application" ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all drivers" ON public.drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('motorbike', 'bakkie', 'panel-van', '4-ton', '8-ton', 'flatbed')),
  make TEXT,
  model TEXT,
  reg_plate TEXT UNIQUE,
  year INTEGER,
  payload_kg INTEGER,
  roadworthy_doc_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  available BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can read own vehicles" ON public.vehicles FOR SELECT USING (
  owner_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "Owners can update own vehicles" ON public.vehicles FOR UPDATE USING (
  owner_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "Anyone can insert vehicle" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all vehicles" ON public.vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Public can read available approved vehicles" ON public.vehicles FOR SELECT USING (status = 'approved' AND available = true);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('move', 'courier', 'haul')),
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motorbike', 'bakkie', 'panel-van', '4-ton', '8-ton', 'flatbed')),
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  distance_km INTEGER,
  base_fare INTEGER NOT NULL,
  distance_cost INTEGER NOT NULL,
  total INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  commission_rate NUMERIC(4,2) NOT NULL,
  driver_payout INTEGER NOT NULL,
  booking_date DATE,
  booking_time TIME,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  notes TEXT,
  payment_method TEXT DEFAULT 'eft' CHECK (payment_method IN ('eft', 'card', 'ozow')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  client_id UUID REFERENCES public.users(id),
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a booking" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Clients can read own bookings" ON public.bookings FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Drivers can read available and own bookings" ON public.bookings FOR SELECT USING (
  status = 'pending' OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "Drivers can update own assigned bookings" ON public.bookings FOR UPDATE USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Availability slots
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicle owners can manage own slots" ON public.availability_slots FOR ALL USING (
  vehicle_id IN (SELECT v.id FROM public.vehicles v JOIN public.drivers d ON v.owner_id = d.id WHERE d.user_id = auth.uid())
);
CREATE POLICY "Admins can manage all slots" ON public.availability_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can read own invoices" ON public.invoices FOR SELECT USING (
  booking_id IN (SELECT id FROM public.bookings WHERE client_id = auth.uid())
);
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'whatsapp')),
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
