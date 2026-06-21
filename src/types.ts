export interface GmailEmail {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  category: string;
  unnecessary: boolean;
  reason: string;
  cleanupActionSuggested: string;
  unsubscribeUrl?: string | null;
}

export type CategoryFilter = "ALL" | "UNNECESSARY" | "IMPORTANT" | "NEWSLETTER" | "PROMOTION" | "NOTIFICATION";
