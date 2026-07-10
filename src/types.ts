export interface Customer {
  id: string;
  name: string;
  phone: string;
  status?: "pending" | "sent" | "completed" | "canceled" | "unimported";
  amount?: string | number;
  sourceFile?: string;
  [key: string]: any; // Allow other fields from Excel
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
}
