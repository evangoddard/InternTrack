import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms that apply to using InternTrack, including what the service does and does not guarantee about internship listings.",
  alternates: { canonical: "/terms" },
};

/**
 * Terms of use — a scaffold, not legal advice.
 *
 * There were no existing terms in the project, so this states the handful of
 * things that are true of the product and flags everything that requires a
 * legal or business decision. It should be reviewed by someone qualified
 * before launch.
 */
export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="10 August 2026">
      <div className="legal-review" role="note">
        <strong>Scaffold — needs your review before launch.</strong> No terms
        existed previously, so this covers only what is verifiably true of the
        product. The <code>[REVIEW]</code> markers need a legal or business
        decision, and this document has not been reviewed by a lawyer.
      </div>

      <p>
        By using {SITE_NAME} you agree to these terms. If you do not agree,
        please do not use the service.
      </p>

      <h2>What {SITE_NAME} is</h2>
      <p>
        {SITE_NAME} aggregates publicly listed internship postings, scores them
        against a résumé you upload, and lets you track your applications. It is
        a research and organisation tool. It does not submit applications on
        your behalf, and it is not a recruiter, employer, or agent.
      </p>

      <h2>No guarantee about listings</h2>
      <p>
        Postings come from a public list and from companies&rsquo; own job
        pages. Listings may be out of date, already filled, or inaccurate, and
        roles may close without notice. {SITE_NAME} does not verify postings and
        makes no guarantee that any listing is current, accurate, or still open.
        Always confirm details on the company&rsquo;s own site before applying.
      </p>

      <h2>No guarantee about outcomes</h2>
      <p>
        Match scores and eligibility checks are automated estimates produced
        from the text of your résumé and the posting. They are not a prediction
        of whether you will be hired, and they are not advice. You are
        responsible for deciding which roles to apply to.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for keeping your login details secure and for the
        activity on your account. You must be old enough to form a binding
        contract where you live. Do not upload content you do not have the right
        to upload, and do not attempt to access other users&rsquo; data or
        disrupt the service.
      </p>

      <h2>Your content</h2>
      <p>
        Your résumé and the information you enter remain yours. You grant{" "}
        {SITE_NAME} permission to store and process them only to provide the
        service — matching, eligibility, and tracking. You can delete them at
        any time, as described in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Availability</h2>
      <p>
        The service is provided as-is and may change or become unavailable
        without notice.{" "}
        <code>
          [REVIEW: whether you want to offer any uptime commitment, and the
          limitation-of-liability and warranty-disclaimer language appropriate
          to your jurisdiction]
        </code>
      </p>

      <h2>Governing law</h2>
      <p>
        <code>
          [REVIEW: the jurisdiction whose law governs these terms and where
          disputes are handled]
        </code>
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        {SUPPORT_EMAIL ? (
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        ) : (
          <code>[REVIEW: support email address]</code>
        )}
        .
      </p>
    </LegalPage>
  );
}
