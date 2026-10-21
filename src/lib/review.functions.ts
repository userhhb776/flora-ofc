import { createServerFn } from "@tanstack/react-start";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

// Review photo upload: only allowed for a customer who proves a delivered order (phone + order code).
export const uploadReviewPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; code: string; type: string; data: string }) => {
    const phone = String(d?.phone ?? "").slice(0, 30);
    const code = String(d?.code ?? "").slice(0, 40);
    const type = String(d?.type ?? "");
    const data = String(d?.data ?? "");
    if (!TYPES[type]) throw new Error("Formato de foto inválido");
    if (data.length > 7_000_000) throw new Error("Foto muito grande (máx. 5MB)");
    return { phone, code, type, data };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.rpc("reviewable_products", { _phone: data.phone, _code: data.code });
    if (!rows || rows.length === 0) throw new Error("Não autorizado");
    const bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
    const path = `reviews/${Date.now()}-${crypto.randomUUID()}.${TYPES[data.type]}`;
    const up = await supabaseAdmin.storage.from("media").upload(path, bytes, { contentType: data.type });
    if (up.error) throw new Error("Falha ao enviar a foto");
    const { data: s, error } = await supabaseAdmin.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 20);
    if (error || !s) throw new Error("Falha ao enviar a foto");
    return { url: s.signedUrl };
  });
