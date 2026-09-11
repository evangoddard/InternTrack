import { redirect } from "next/navigation";

/**
 * The workspace was reviewed here before it became the real dashboard. It now
 * lives at /dashboard, so this only exists to keep that URL working for
 * anyone who bookmarked it during review.
 */
export default function WorkspaceRedirect() {
  redirect("/dashboard");
}
