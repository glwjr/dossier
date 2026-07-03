/**
 * The dashed "nothing here yet" placeholder shown by list views when a
 * collection is empty. (For error/not-found states, use ErrorState instead.)
 */
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
