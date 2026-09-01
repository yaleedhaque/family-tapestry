# Family Tapestry — Admin Rights Survival Guide
**Keep this safe. If you ever lose admin access, this is how to get it back.**

Your project: `eamcenktssskftpxeykw`  ·  Dashboard: https://supabase.com/dashboard/project/eamcenktssskftpxeykw

---

## ✅ What has been set up

1. **You are Admin** (main account): `yaleedhaque@gmail.com`
2. **Safety-net Admin** (backup, never used daily): `yaleedhaque1@gmail.com`
   - Its password is stored in your **encrypted vault** under key `safety-admin`.
   - Get it: `bash ~/.config/opencode/scripts/vault.sh get safety-admin`
3. **Admin Guarantee trigger** — `protect_last_admin_trg`, **INSTALLED + TESTED** (2026-08-31). The last admin can NEVER be demoted/deleted/revoked, even through the website. Verified end-to-end in the database.
4. **Full management credentials** stored in the **encrypted vault** (`bash ~/.config/opencode/scripts/vault.sh get <key>`):
   - `supabase-access-token` — Personal Access Token (`sbp_...`, full Supabase account privileges)
   - `supabase-all-keys` — publishable / secret / anon / service_role API keys
   - `supabase-admin-info` — project ref / url / emails / recovery paths
   - `safety-admin` — safety-net admin login

---

## 🔒 The guarantee is INSTALLED (no action needed)

The **last-admin guarantee trigger** is live in the database and was verified on 2026-08-31:
- Demoting the **last** admin → **blocked**
- Deleting the **last** admin → **blocked**
- Revoking (approve=false) the **last** admin → **blocked**
- (Removing an admin while another admin still exists → **allowed**, as expected)

> To double-check anytime: on the Admin Dashboard try to change your own role to "Viewer" — it should refuse since you'd be the last admin. Or re-run the SQL in the dashboard SQL Editor.

---

## ❗ If you are locked out (manual recovery)

1. Log into the **Supabase Dashboard** (you keep the account with Google/GitHub login to Supabase itself).
2. Go to **Authentication → Users**, find your email, and check it's there.
3. Go to **SQL Editor** and run Part 2 of the SQL file → make your user an approved admin again.

---

## 🔑 Forgot your password?

**For the website:** Supabase Dashboard → **Authentication → Users** → find the user → click **"Reset password"** (sends a reset link to their email).

**We also have TWO admin users now** — if one is locked out, the other can still manage everything.

---

## 🛡️ Good habits to never lose access
- Never set **your own** role to Viewer/Editor to "test" — that's how people lock themselves out.
- Keep at least **2 approved admins** at all times (you now have 2).
- Keep the safety-net password in the vault — don't change it casually.
- If you ever add a 3rd admin, remember you can always remove it.

---
*Last updated: 2026-08-31 by Stark*
