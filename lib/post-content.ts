import type { Campaign, GeneratedPost } from "@/lib/types";

export const postDetailLabels = [
  "Recommended media use",
  "Optional alt text",
  "Suggested overlay text",
  "CTA"
];

export function extractPostDetail(content: string, label: string) {
  const pattern = new RegExp(
    `${label}:\\s*([\\s\\S]*?)(?=\\n\\n(?:${postDetailLabels.join("|")}):|$)`,
    "i"
  );
  return content.match(pattern)?.[1]?.trim() ?? "";
}

export function stripDetailSections(content: string) {
  const firstDetailIndex = postDetailLabels
    .map((label) => content.toLowerCase().indexOf(`${label.toLowerCase()}:`))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return (firstDetailIndex >= 0 ? content.slice(0, firstDetailIndex) : content).trim();
}

export function hasInternalBriefScaffolding(content: string) {
  return [
    /^Profile:/im,
    /^Company Knowledge used:/im,
    /^Approved examples to learn from:/im,
    /^Details \/ raw notes:/im,
    /From .* perspective, make this about/i,
    /Use the attached media context directly/i,
    /Do not invent a different topic/i,
    /^Voice direction:/im
  ].some((pattern) => pattern.test(content));
}

export function userFacingPostContent(content: string, campaign?: Campaign, post?: GeneratedPost) {
  if (post?.postCopy && !hasInternalBriefScaffolding(post.postCopy)) {
    return post.postCopy.trim();
  }

  const stripped = stripDetailSections(content);
  if (!hasInternalBriefScaffolding(stripped)) {
    return stripped;
  }

  const intent = campaign?.intent || "Here is the practical takeaway.";
  const details = campaign?.idea;
  const mediaNote = campaign?.mediaContext?.notes || campaign?.mediaContext?.analysis?.description;
  const profileName = campaign?.profileName || post?.profileName || "this team";
  const isCompany = campaign?.profileType === "Company Account" || post?.profileType === "Company Account";

  if (post?.platform === "X") {
    return [
      intent,
      mediaNote && `The useful signal: ${mediaNote}`,
      "Build from the real workflow, not the polished pitch."
    ].filter(Boolean).join("\n\n");
  }

  if (post?.platform === "Instagram") {
    return [
      intent,
      mediaNote && `What this shows: ${mediaNote}`,
      "The best work happens close to the actual process, where the handoffs and constraints are visible."
    ].filter(Boolean).join("\n\n");
  }

  if (post?.platform === "TikTok") {
    return [
      `Hook: ${intent}`,
      "Short script:",
      `1. Open on the ${mediaNote ? "media" : "moment"}.`,
      mediaNote && `2. Point out what is happening: ${mediaNote}.`,
      `3. Explain the takeaway: ${intent}.`,
      "4. Close with why building close to the workflow matters."
    ].filter(Boolean).join("\n");
  }

  return [
    isCompany
      ? `${profileName} is sharing this because the best automation work starts with the real workflow.`
      : "I keep coming back to this: the best product work happens closest to the real workflow.",
    intent,
    details && `The context: ${details}`,
    mediaNote && `The useful signal from the media: ${mediaNote}`,
    "The takeaway is simple: build where the work actually happens, then let the product earn its way into the process."
  ].filter(Boolean).join("\n\n");
}
