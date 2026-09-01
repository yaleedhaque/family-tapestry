-- v5: custom-language native name per person
-- Adds an optional native-script name field (Bengali/Hindi/Arabic/etc.) to persons.
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS name_native text;
