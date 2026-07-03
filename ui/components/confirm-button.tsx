"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * A small inline destructive-action control that manages its own two-step
 * confirmation: the trigger flips to a Confirm/Cancel pair, and Confirm runs
 * `onConfirm` then resets. Replaces the hand-rolled `confirmDelete` state and
 * ternary that was duplicated across every list row.
 */
export function ConfirmButton({
  onConfirm,
  label = "Delete",
  confirmLabel,
}: {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="destructive"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            onConfirm();
            setConfirming(false);
          }}
        >
          {confirmLabel ?? label}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground"
      onClick={() => setConfirming(true)}
    >
      {label}
    </Button>
  );
}
