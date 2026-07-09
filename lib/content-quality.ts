export function looksLikeGenericRawIdea(value?: string, extraGenericIdeas: string[] = []) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return true;
  }

  const genericIdeas = [
    ...extraGenericIdeas.map((item) => item.toLowerCase()),
    "write a social post",
    "create a brief",
    "make a post",
    "generate posts",
    "turn this into content",
    "content creation",
    "brand voice",
    "marketing workflow",
    "platform-ready social posts",
    "why it matters",
    "what the audience should take away",
    "product workflow launch",
    "brand voice consistent"
  ];

  return normalized.length < 24 || genericIdeas.some((item) => normalized.includes(item));
}

export function looksLikeGenericIntent(value?: string) {
  const normalized = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return true;
  }

  const genericIntent = [
    "describe what happened",
    "why it matters",
    "what the audience should take away",
    "write a post",
    "make content",
    "create a social post",
    "product workflow launch",
    "brand voice consistent"
  ];

  return normalized.length < 36 || genericIntent.some((item) => normalized.includes(item));
}
