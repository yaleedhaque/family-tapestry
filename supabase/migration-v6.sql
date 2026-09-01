-- v6: gender for the "no two mothers/fathers" rule
-- Adds an optional gender column to persons ("" = unknown, or male/female/other).
-- The app enforces at most one known biological mother and one known biological
-- father per child; a second one must be added as Step or Adopted (which draw
-- with a different-coloured line and are never limited).
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_persons_gender ON public.persons(gender);
