import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Digital Family Tapestry",
  description: "Privacy policy for the Digital Family Tapestry application.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="font-display text-2xl text-[var(--thread-gold)]">Family Tapestry</Link>
        </div>

        <h1 className="font-display text-3xl text-[var(--thread-gold)] mb-2">Privacy Policy</h1>
        <p className="text-xs text-[var(--parchment-dim)] mb-8">Last updated: August 2026</p>

        <div className="space-y-8 text-sm text-[var(--parchment-dim)] font-body leading-relaxed">
          <Section title="Overview">
            <p>Family Tapestry is a collaborative family tree application. We collect only the information necessary to provide the service. We do not sell, trade, or share your personal data with third parties for marketing purposes.</p>
          </Section>

          <Section title="Information We Collect">
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong className="text-[var(--parchment)]">Account information</strong> — Your email address and display name, provided during sign-up (email/password or Google OAuth).</li>
              <li><strong className="text-[var(--parchment)]">Family tree data</strong> — Names, dates, locations, biographies, photos, and relationship information you choose to add to the tree.</li>
              <li><strong className="text-[var(--parchment)]">Usage data</strong> — Anonymous analytics (page views, visit duration) collected by Vercel Analytics to improve the application.</li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>To provide and maintain the family tree service.</li>
              <li>To authenticate your identity and manage your access.</li>
              <li>To enable collaboration between family members you invite.</li>
              <li>To improve the application through anonymous usage analytics.</li>
            </ul>
          </Section>

          <Section title="Data Storage & Security">
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>All data is stored in Supabase (PostgreSQL), encrypted at rest.</li>
              <li>Photos are stored in Supabase Storage with access controls.</li>
              <li>Authentication is handled by Supabase Auth with industry-standard security.</li>
              <li>Data is transmitted over HTTPS (TLS encryption).</li>
            </ul>
          </Section>

          <Section title="Data Sharing">
            <p>Family tree data you add is visible to all authenticated users of the application. Your email address is not shared with other users. We do not share data with any third parties except as necessary for service operation (Supabase for hosting, Vercel for deployment).</p>
          </Section>

          <Section title="Your Rights">
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong className="text-[var(--parchment)]">Export</strong> — You can export all your family tree data at any time via GEDCOM format.</li>
              <li><strong className="text-[var(--parchment)]">Account deletion</strong> — Contact the administrator to request deletion of your account and associated data.</li>
              <li><strong className="text-[var(--parchment)]">Data correction</strong> — You can edit your profile and family tree information at any time.</li>
            </ul>
          </Section>

          <Section title="Cookies">
            <p>Family Tapestry uses essential session cookies for authentication. No tracking cookies are used. Vercel Analytics uses a first-party cookie for anonymous visit tracking.</p>
          </Section>

          <Section title="Children&apos;s Privacy">
            <p>Family Tapestry is intended for use by adults to record family history. We do not knowingly collect personal information from children under 13. If you believe a child&apos;s information has been added without parental consent, contact the administrator to have it removed.</p>
          </Section>

          <Section title="Changes to This Policy">
            <p>We may update this privacy policy from time to changes. Changes will be reflected on this page with an updated date. Continued use of the application after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="Contact">
            <p>For privacy-related questions or requests, contact:</p>
            <a
              href="mailto:yaleedhaque@gmail.com?subject=Privacy%20Policy%20Inquiry"
              className="inline-block mt-2 px-4 py-2 text-xs rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--thread-gold)]/30 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors"
            >
              yaleedhaque@gmail.com
            </a>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--thread-gold-dim)]/20">
          <Link href="/" className="text-xs text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">
            ← Back to Family Tapestry
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg text-[var(--thread-gold)] mb-2">{title}</h2>
      <div>{children}</div>
    </div>
  );
}
