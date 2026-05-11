import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase/client";
import type { ShoppingRayon } from "@/types/cocon";

export interface ParseShoppingItemOutput {
  name: string;
  emoji?: string;
  quantity?: number;
  unit?: string;
  rayon?: ShoppingRayon;
  confidence: number;
}

const callable = httpsCallable<
  { text: string },
  ParseShoppingItemOutput
>(functions, "parseShoppingItem");

export async function parseShoppingItemNatural(
  text: string,
): Promise<ParseShoppingItemOutput> {
  const result = await callable({ text });
  return result.data;
}
