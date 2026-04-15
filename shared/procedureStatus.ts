export const PROCEDURE_STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  ongoing: { variant: "outline", label: "Ongoing" },
  adopted: { variant: "default", label: "Adopted" },
  rejected: { variant: "destructive", label: "Rejected" },
  withdrawn: { variant: "secondary", label: "Withdrawn" },
};
