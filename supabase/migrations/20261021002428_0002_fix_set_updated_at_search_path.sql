/*
# Fix set_updated_at search_path (security lint)

1. Hardens the `set_updated_at` trigger function by setting an explicit
   `search_path` so it cannot be hijacked via a mutable role search_path.
   No data changes — purely a security hardening of the existing trigger.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
