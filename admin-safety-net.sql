-- ============================================================================
-- Family Tapestry - ADMIN SAFETY-NET SQL
-- Run these in: Supabase Dashboard -> SQL Editor -> New query
-- Project: eamcenktssskftpxeykw
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: THE GUARANTEE TRIGGER
-- Prevents the LAST remaining admin from ever being demoted, revoked, or having
-- their row deleted. This runs INSIDE the database, so even the web app code
-- cannot override it. This is the strongest possible protection.
--
-- STATUS: INSTALLED + TESTED 2026-08-31 by Stark (via temporary DB access).
--         No action needed unless you ever need to re-apply it.
-- ----------------------------------------------------------------------------

-- Create a function that enforces "never demote/remove the last admin"
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_count integer;
BEGIN
    -- Only enforce when the change would remove an admin's admin-ness.
    -- i.e. an admin's row is being deleted, OR its role changes away from 'admin',
    -- OR an admin is being set to not-approved (revoked).
    IF (TG_OP = 'DELETE' AND OLD.role = 'admin')
       OR (TG_OP = 'UPDATE'
           AND OLD.role = 'admin'
           AND (NEW.role IS DISTINCT FROM 'admin'
                OR NEW.approved IS DISTINCT FROM true)) THEN

        -- Count how many OTHER approved admins would remain.
        SELECT count(*) INTO admin_count
        FROM public.profiles
        WHERE approved = true
          AND role = 'admin'
          AND id <> OLD.id;

        -- If zero others remain, forbid it.
        IF admin_count = 0 THEN
            RAISE EXCEPTION 'Cannot remove or demote the last admin. Add another admin first, or do this via the database with a super-user.';
        END IF;
    END IF;

    -- Allow the operation otherwise.
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS protect_last_admin_trg ON public.profiles;
CREATE TRIGGER protect_last_admin_trg
BEFORE DELETE OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_admin();

-- Verify it was installed
SELECT tgname FROM pg_trigger WHERE tgname = 'protect_last_admin_trg';

-- ----------------------------------------------------------------------------
-- PART 2: MANUAL RECOVERY (if you are LOCKED OUT of the web dashboard)
-- If somehow your admin rights were removed and you need to restore them by
-- hand, run this, replacing <your_user_id> with your account's UUID:
--   Your admin user id (from profiles): feel free to run:
--     SELECT id, email FROM auth.users;   -- (email lives in auth, not profiles)
-- ----------------------------------------------------------------------------

-- STEP A: Find your user id by email (if you know your email):
--   SELECT id, email FROM auth.users WHERE email = 'yaleedhaque@gmail.com';

-- STEP B: Make your user an APPROVED ADMIN again:
--   UPDATE public.profiles SET role = 'admin', approved = true, updated_at = now()
--   WHERE id = '<your_user_id>';

-- (If the last-admin trigger blocks you because you are the ONLY admin and it
--  was somehow removed, temporarily disable the trigger first, run the UPDATE,
--  then re-enable it:)
--   ALTER TABLE public.profiles DISABLE TRIGGER protect_last_admin_trg;
--   UPDATE public.profiles SET role='admin', approved=true WHERE id='<your_user_id>';
--   ALTER TABLE public.profiles ENABLE TRIGGER protect_last_admin_trg;

-- ----------------------------------------------------------------------------
-- PART 3: RESET A FORGOTTEN PASSWORD
-- Supabase Dashboard -> Authentication -> Users -> find the user -> "Reset password"
-- (or "Magic link") - sends them a reset link to their email.
-- ----------------------------------------------------------------------------
