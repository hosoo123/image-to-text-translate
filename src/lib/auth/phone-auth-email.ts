import { createHash } from "node:crypto";

// Phone-only Supabase Auth accounts use a private, non-routable email identifier.
// Users never see this address; phone ownership is verified separately by Verify.MN.
export function phoneAuthEmail(phone: string) {
  const digest = createHash("sha256").update(phone).digest("hex").slice(0, 32);
  return `phone-${digest}@phone-login.invalid`;
}
