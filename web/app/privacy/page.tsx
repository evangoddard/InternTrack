import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What InternTrack stores, why, and how to delete it. Résumés and saved roles are protected by row-level security and are never sent to a third-party AI service.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy policy.
 *
 * Every factual claim here was checked against the code: the tables in
 * supabase/schema.sql, the storage upload path in app/resume/actions.ts, the
 * RLS policies, and lib/analytics.ts. Anything that depends on a business or
 * legal fact I cannot verify is rendered as a visible [REVIEW] placeholder
 * rather than invented — see the notice at the top of the page.
 */
export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="10 August 2026">
      <div className="legal-review" role="note">
        <strong>Needs your review before launch.</strong> The sections marked{" "}
        <code>[REVIEW]</code> depend on business and legal facts that cannot be
        read from the codebase — the operating entity, hosting region, and a
        contact address. Everything else describes what the product actually
        does today. Delete this notice once the placeholders are filled in.
      </div>

      <p>
        This policy explains what {SITE_NAME} stores about you, why it stores
        it, and how to remove it. It covers the {SITE_NAME} website and web
        application.
      </p>

      <h2>Who runs {SITE_NAME}</h2>
      <p>
        {SITE_NAME} is operated by <code>[REVIEW: legal entity or individual
        name, and country of operation]</code>. For any question about this
        policy or your data, contact{" "}
        {SUPPORT_EMAIL ? (
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        ) : (
          <code>[REVIEW: support email address]</code>
        )}
        .
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Account details.</strong> Your email address and an encrypted
          password, held by our authentication provider. We never see or store
          your password in readable form.
        </li>
        <li>
          <strong>Your résumé.</strong> The file you upload, plus the plain text
          extracted from it so postings can be scored against your background.
          Both are stored against your user ID.
        </li>
        <li>
          <strong>Your profile.</strong> Optional name, degree level, graduation
          year, and the role categories you are interested in — used to work out
          which postings you are eligible for.
        </li>
        <li>
          <strong>Your activity in the product.</strong> Which postings you have
          saved, which you have hidden, and the stage and dates you record
          against each application.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>
          We do not sell your data, and we do not share it with advertisers.
        </li>
        <li>
          We do not send your résumé, its text, or your application history to a
          third-party AI or machine-learning service. Matching is computed
          inside {SITE_NAME} using a term-frequency algorithm.
        </li>
        <li>
          We do not send any personal data to analytics. See below.
        </li>
      </ul>

      <h2>Who can see your data</h2>
      <p>
        Every row and stored file is protected by row-level security policies
        scoped to your user ID, which means another signed-in account cannot
        read your résumé, your saved roles, or your tracker — the database
        rejects the request rather than relying on the application to filter it.
      </p>
      <p>
        Data is hosted on our behalf by Supabase, which provides the database,
        authentication, and file storage. Hosting region:{" "}
        <code>[REVIEW: the region your Supabase project is provisioned in]</code>
        .
      </p>

      <h2>Analytics</h2>
      <p>
        If analytics is enabled for this deployment, we use Google Analytics to
        count interactions on the public marketing pages — for example, that a
        &ldquo;Get Started&rdquo; button was clicked, or that an FAQ entry was
        opened. IP addresses are anonymised. We never send résumé content,
        posting details, application status, or anything else tied to your
        account. If no analytics measurement ID is configured, no analytics
        script loads and no analytics cookies are set at all.
      </p>

      <h2>Job postings</h2>
      <p>
        Postings shown in {SITE_NAME} are aggregated from a public internship
        list and from the companies&rsquo; own publicly available job pages.
        Applying to a role takes you to the company&rsquo;s site, where their
        privacy policy applies rather than ours. {SITE_NAME} is not affiliated
        with the companies whose postings it lists.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete your résumé, and the stored file with it, from the Résumé
        page at any time. You can remove saved roles and tracker rows from the
        Tracker page. To delete your account and everything associated with it,
        use the Account page or contact us at the address above.
      </p>
      <p>
        We keep your data for as long as your account exists. There is no
        separate retention period after deletion — removing a record removes it.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live you may have rights to access, correct,
        export, or delete your personal data. The Account page can export your
        data, and deletion is available as described above. For anything else,
        contact us.{" "}
        <code>
          [REVIEW: if you have users in the EU/UK or California, this section
          should name GDPR/CCPA explicitly and state your legal basis for
          processing]
        </code>
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially, we will update the date at the top of
        this page.
      </p>
    </LegalPage>
  );
}
