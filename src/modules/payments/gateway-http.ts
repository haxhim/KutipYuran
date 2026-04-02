export async function parseGatewayJsonResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    const snippet = text.slice(0, 200).trim();
    throw new Error(snippet ? `${fallbackMessage}: ${snippet}` : `${fallbackMessage}: empty response`);
  }
}

export function readGatewayErrorMessage(raw: unknown, fallbackMessage: string) {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  if (Array.isArray(raw)) {
    const first = raw[0] as Record<string, unknown> | undefined;
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg.trim();
    }
  }

  if (raw && typeof raw === "object") {
    const candidate = raw as Record<string, unknown>;
    for (const key of ["message", "msg", "error", "detail"]) {
      if (typeof candidate[key] === "string" && candidate[key]?.trim()) {
        return candidate[key].trim();
      }
    }
  }

  return fallbackMessage;
}
