import { toast } from "sonner";
import { AuthError } from "@/lib/api";

export function onMutationError(error: Error) {
  if (error instanceof AuthError) return;
  toast.error("Something went wrong");
}
