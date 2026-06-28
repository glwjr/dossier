import Link from "next/link";

export function ErrorState({
  title,
  message,
  backHref,
  backLabel,
}: {
  title: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {message && (
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      )}
      {backHref && (
        <Link
          href={backHref}
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          {backLabel ?? "Go back"} →
        </Link>
      )}
    </div>
  );
}
