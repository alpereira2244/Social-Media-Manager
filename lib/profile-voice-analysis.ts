import { sourceLearningBasisLabel, sourceLearningKind, isSocialProfileSource } from "@/lib/profile-source-utils";
import type { Profile, ProfileVoiceAnalysis, ProfileVoiceExample } from "@/lib/types";

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

export function joinVoiceAnalysis(
  examples: ProfileVoiceExample[] | undefined,
  key: keyof NonNullable<ProfileVoiceExample["analysis"]>,
  fallback: string
) {
  const values = (examples ?? [])
    .filter((example) => example.useAsVoice && example.analysis)
    .flatMap((example) => example.analysis?.[key] ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? Array.from(new Set(values)).slice(0, 8).join(", ") : fallback;
}

export function joinProfileVoiceAnalysis(
  profile: Pick<Profile, "voiceExamples" | "voiceSources">,
  key: keyof NonNullable<ProfileVoiceExample["analysis"]>,
  fallback: string
) {
  const exampleValues = joinVoiceAnalysis(profile.voiceExamples, key, "");
  const sourceValues = (profile.voiceSources ?? [])
    .filter((source) => source.analysis)
    .flatMap((source) => source.analysis?.[key] ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  const values = [
    ...exampleValues.split(",").map((value) => value.trim()).filter(Boolean),
    ...sourceValues
  ];

  return values.length > 0 ? Array.from(new Set(values)).slice(0, 8).join(", ") : fallback;
}

export function profileVoiceExampleTitles(profile?: Pick<Profile, "voiceExamples">) {
  return (profile?.voiceExamples ?? [])
    .filter((example) => example.useAsVoice && example.analysis)
    .map((example) => `${example.title} (manual pasted example)`)
    .filter(Boolean);
}

export function profileVoiceSourceTitles(profile?: Pick<Profile, "voiceSources">) {
  return (profile?.voiceSources ?? [])
    .filter((source) => source.analysis || source.syncStatus === "synced")
    .map((source) => `${source.title || `${source.platform} source`} (${sourceLearningBasisLabel(source)})`)
    .filter(Boolean);
}

export function analyzedProfileSources(profile?: Pick<Profile, "voiceSources">) {
  return (profile?.voiceSources ?? []).filter((source) =>
    source.analysis ||
    source.syncStatus === "analyzed" ||
    source.syncStatus === "public page analyzed"
  );
}

export function voiceSourceConfidence(profile?: Pick<Profile, "voiceSources" | "voiceExamples">) {
  const analyzedSources = analyzedProfileSources(profile);
  const manualExamples = (profile?.voiceExamples ?? []).filter((example) => example.useAsVoice && example.analysis);
  const syncedCount = analyzedSources.filter((source) => sourceLearningKind(source) === "API synced and analyzed").length;
  const websiteWords = analyzedSources.reduce((sum, source) => sum + countWords(source.fetchedContent ?? ""), 0);
  const richExamples = analyzedSources.filter((source) =>
    sourceLearningKind(source) === "Pasted text analyzed" ||
    sourceLearningKind(source) === "Screenshot analyzed"
  ).length + manualExamples.length;
  const notesOnly = analyzedSources.length > 0 && richExamples === 0 && websiteWords === 0 && syncedCount === 0;

  if (syncedCount > 0 || richExamples >= 6) return "High";
  if (richExamples >= 3 || websiteWords > 250) return "Medium";
  if (richExamples >= 1 || notesOnly || websiteWords > 0) return "Low";
  return "Not learned yet";
}

export function profileAnalyzedMaterialCount(profile?: Pick<Profile, "voiceSources" | "voiceExamples">) {
  return analyzedProfileSources(profile).length + profileVoiceExampleTitles(profile).length;
}

export function profileLearningBasisSummary(profile?: Pick<Profile, "voiceSources" | "voiceExamples">) {
  const sources = analyzedProfileSources(profile);
  const manualExamples = (profile?.voiceExamples ?? []).filter((example) => example.useAsVoice && example.analysis);
  const notes = sources.filter((source) => sourceLearningKind(source) === "Notes analyzed").length;
  const pasted = sources.filter((source) => sourceLearningKind(source) === "Pasted text analyzed").length + manualExamples.length;
  const screenshots = sources.filter((source) => sourceLearningKind(source) === "Screenshot analyzed").length;
  const websites = sources.filter((source) => sourceLearningKind(source) === "Website fetched and analyzed").length;
  const publicPages = sources.filter((source) => sourceLearningKind(source) === "Public page analyzed").length;
  const synced = sources.filter((source) => sourceLearningKind(source) === "API synced and analyzed").length;
  const parts = [
    notes > 0 ? `notes only (${notes})` : "",
    pasted > 0 ? `${pasted} pasted examples` : "",
    screenshots > 0 ? `${screenshots} screenshots` : "",
    websites > 0 ? "fetched website content" : "",
    publicPages > 0 ? `${publicPages} public pages` : "",
    synced > 0 ? "API synced posts" : ""
  ].filter(Boolean);

  if (parts.length === 0) return "No analyzed learning material yet.";
  return `Based on ${parts.join(", ")}.`;
}

export function profileHasOnlyNotesBasedLearning(profile?: Pick<Profile, "voiceSources" | "voiceExamples">) {
  const sources = analyzedProfileSources(profile);
  const manualExamples = (profile?.voiceExamples ?? []).filter((example) => example.useAsVoice && example.analysis);
  return (
    sources.length > 0 &&
    manualExamples.length === 0 &&
    sources.every((source) => sourceLearningKind(source) === "Notes analyzed")
  );
}

export function profileHasSavedSocialLinksWithoutAnalysis(profile?: Pick<Profile, "voiceSources">) {
  return (profile?.voiceSources ?? []).some((source) =>
    isSocialProfileSource(source) && !source.analysis && source.syncStatus !== "analyzed" && source.syncStatus !== "synced"
  );
}

export function profileSourceLinkCount(profile?: Pick<Profile, "voiceSources">) {
  return (profile?.voiceSources ?? []).filter((source) => source.url).length;
}

export function profileConfidenceLabel(profile?: Pick<Profile, "voiceSources" | "voiceExamples">) {
  const confidence = voiceSourceConfidence(profile);
  return confidence === "Not learned yet" ? "No confidence" : confidence;
}

export function joinedProfileAnalysisValues(
  profile: Pick<Profile, "voiceSources" | "voiceExamples">,
  key: keyof Omit<ProfileVoiceAnalysis, "confidenceLevel">,
  fallback: string
) {
  const sourceValues = (profile.voiceSources ?? [])
    .filter((source) => source.analysis)
    .flatMap((source) => source.analysis?.[key] ?? [])
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
  const exampleValues = (profile.voiceExamples ?? [])
    .filter((example) => example.analysis)
    .flatMap((example) => example.analysis?.[key] ?? [])
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean);
  const values = Array.from(new Set([...sourceValues, ...exampleValues]));
  return values.length > 0 ? values.slice(0, 8).join(", ") : fallback;
}

export function learnedProfileHookPatterns(profile: Pick<Profile, "voiceSources" | "voiceExamples" | "personality">) {
  return joinedProfileAnalysisValues(profile, "hookPatterns", profile.personality.commonHooks || "No hook patterns learned yet.");
}

export function learnedProfilePostStructures(profile: Pick<Profile, "voiceSources" | "voiceExamples">) {
  return joinedProfileAnalysisValues(profile, "postStructures", "No post structures learned yet.");
}

export function learnedProfileVisualStyle(profile: Pick<Profile, "voiceSources" | "voiceExamples">) {
  return joinedProfileAnalysisValues(profile, "formattingHabits", "No visual or formatting style learned yet.");
}

export function learnedProfilePacing(profile: Pick<Profile, "voiceSources" | "voiceExamples" | "personality">) {
  return joinedProfileAnalysisValues(profile, "sentenceStyle", profile.personality.sentenceStyle || "No pacing learned yet.");
}

export function learnedProfileCtaPatterns(profile: Pick<Profile, "voiceSources" | "voiceExamples">) {
  return joinedProfileAnalysisValues(profile, "platformPatterns", "No CTA or platform patterns learned yet.");
}

export function learnedProfileImitate(profile: Pick<Profile, "voiceSources" | "voiceExamples" | "patternsToLearn">) {
  return joinedProfileAnalysisValues(profile, "imitate", profile.patternsToLearn || "No imitation guidance learned yet.");
}

export function learnedProfileDoNotCopy(profile: Pick<Profile, "voiceSources" | "voiceExamples" | "thingsNotToCopy">) {
  return joinedProfileAnalysisValues(profile, "doNotCopy", profile.thingsNotToCopy || "Do not copy external wording, identity, claims, or facts.");
}

export function profileHasAnalyzedVoiceExamples(profile: Pick<Profile, "voiceExamples" | "voiceSources">) {
  return profileVoiceExampleTitles(profile).length > 0 || profileVoiceSourceTitles(profile).length > 0;
}

export function createPersonalitySummary(
  profile: Pick<Profile, "name" | "type" | "role" | "bio" | "examples" | "notes"> & {
    voiceExamples?: ProfileVoiceExample[];
    voiceSources?: Profile["voiceSources"];
  }
) {
  const words = countWords(`${profile.bio} ${profile.examples} ${profile.notes}`);
  const hasLearnedVoice = profileHasAnalyzedVoiceExamples(profile);
  const isPerson =
    profile.type === "Founder" ||
    profile.type === "Team Member" ||
    profile.type === "Internal Voice";
  const isCompany = profile.type === "Company Account";
  const isInspiration =
    profile.type === "Inspiration / Reference" ||
    profile.type === "Competitor / Market Watch";

  return {
    voiceTraits: hasLearnedVoice
      ? joinProfileVoiceAnalysis(profile, "toneTraits", "Learned voice examples are available.")
      : isInspiration
      ? "Use as pattern inspiration only, not as a voice to copy"
      : isPerson
      ? "Personal, specific, opinionated, experience-led"
      : isCompany
        ? "Clear, credible, useful, product-aware"
        : "Adaptable, practical, grounded, audience-aware",
    commonTopics: hasLearnedVoice
      ? joinProfileVoiceAnalysis(profile, "commonTopics", "Topics are being learned from profile sources.")
      : isCompany
      ? "Product value, customer pain, proof points, market education"
      : "Lessons learned, category POV, operating decisions, practical advice",
    commonHooks: hasLearnedVoice
      ? joinProfileVoiceAnalysis(profile, "hookPatterns", "Hooks are being learned from profile sources.")
      :
      words > 40
        ? "One thing I have learned..., The pattern we keep seeing..., Here is the practical version..."
        : "Quick take:, A useful way to think about this:, The mistake most teams make...",
    sentenceStyle: hasLearnedVoice
      ? joinProfileVoiceAnalysis(profile, "sentenceStyle", "Sentence style is being learned from profile sources.")
      : isPerson
      ? "Mix of short conviction lines with a few reflective explanations."
      : "Structured, scannable, benefit-led sentences with clear takeaways.",
    repeatedPhrases: hasLearnedVoice
      ? joinProfileVoiceAnalysis(profile, "repeatedPhrases", "Repeated phrases are being learned from profile sources.")
      :
      words > 40
        ? "clear workflow, useful signal, practical next step, stronger message"
        : "simple system, sharper posts, better inputs, less guesswork",
    avoid: hasLearnedVoice
      ? joinProfileVoiceAnalysis(profile, "phrasesToAvoid", "Generic claims, invented proof, over-polished language, platform cliches")
      : "Generic claims, invented proof, over-polished language, platform cliches",
    bestPlatforms: isCompany
      ? "LinkedIn, Instagram, X"
      : "LinkedIn, X, TikTok",
    bestUseCases: isInspiration
      ? `${profile.name || "This profile"} works best for studying structure, format, hooks, and creative patterns without copying wording or facts.`
      : `${profile.name || "This profile"} works best for ${profile.role || profile.type} POV posts, launch content, education, and campaign drafts.`
  };
}
