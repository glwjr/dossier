import { ErrorState } from "@/components/error-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <ErrorState
        title="Page not found"
        message="The page you're looking for doesn't exist."
        backHref="/"
        backLabel="Back to dashboard"
      />
    </div>
  );
}
