import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { uploadResume, deleteResume } from "@/app/resume/actions";

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-4">
        <h1 className="font-display text-2xl font-semibold text-text">Résumé</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in to upload and store your résumé.
        </p>
        <Link
          href="/login"
          className="mt-4 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-text"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: resumes, error } = await supabase
    .from("resumes")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) console.error("failed to load resumes:", error.message);

  // Private bucket -- a short-lived signed URL is how the owner previews
  // their own file; anyone else's link attempt fails the storage RLS check
  // before a signed URL would even be issued.
  const withUrls = await Promise.all(
    (resumes ?? []).map(async (row) => {
      const { data } = await supabase.storage
        .from("resumes")
        .createSignedUrl(row.storage_path, 60 * 10);
      return { ...row, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-text">Résumé</h1>
      <p className="mt-1 text-sm text-text-muted">
        Stored privately — only you can access it. PDF and .txt files are read
        for matching on the Personal tab; other formats are stored but not
        parsed yet.
      </p>

      {params.error && (
        <p className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {params.error}
        </p>
      )}

      <form
        action={uploadResume}
        className="glass mt-6 flex flex-wrap items-center gap-3 rounded-2xl p-4"
      >
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.txt"
          className="text-sm text-text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent-fill file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-text"
        />
        <button
          type="submit"
          className="rounded-full bg-accent-fill px-4 py-1.5 text-sm font-semibold text-text transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Upload
        </button>
      </form>

      {withUrls.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">No résumé uploaded yet.</p>
      ) : (
        <ul className="mt-6">
          {withUrls.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
            >
              <div className="min-w-0">
                {row.signedUrl ? (
                  <a
                    href={row.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-semibold text-text hover:text-accent-bright"
                  >
                    {row.file_name}
                  </a>
                ) : (
                  <span className="truncate text-sm font-semibold text-text">
                    {row.file_name}
                  </span>
                )}
                <div className="text-xs text-text-muted">
                  uploaded {new Date(row.uploaded_at).toLocaleDateString()}
                </div>
              </div>
              <form action={deleteResume}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="storage_path" value={row.storage_path} />
                <button
                  type="submit"
                  className="shrink-0 text-xs text-text-faint transition-colors hover:text-red-400"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
