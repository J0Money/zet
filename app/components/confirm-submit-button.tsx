"use client";

import type { ReactNode } from "react";

// En almindelig submit-knap kan ikke have en onClick-håndtering i en
// server-komponent (serveren kender ikke JavaScript-funktioner). Denne lille
// klientkomponent løser det, så fx en slet-knap kan bede om bekræftelse,
// uden at hele siden omkring den skal være "use client".
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
