import type { PostQueueItem } from "@/lib/types";

type Metrics = PostQueueItem["metrics"];

type ContentMetricItem = {
  metrics?: Metrics;
  postedAt?: string;
  createdAt: string;
  readinessScore?: number;
};

export function metricNumber(value?: number) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function metricsHaveValues(metrics?: Metrics) {
  if (!metrics) return false;
  return (
    metricNumber(metrics.impressions) +
    metricNumber(metrics.likes) +
    metricNumber(metrics.comments) +
    metricNumber(metrics.shares) +
    metricNumber(metrics.saves) +
    metricNumber(metrics.clicks)
  ) > 0;
}

export function engagementTotal(item: PostQueueItem) {
  const metrics = item.metrics ?? {};
  return (
    metricNumber(metrics.likes) +
    metricNumber(metrics.comments) +
    metricNumber(metrics.shares) +
    metricNumber(metrics.saves) +
    metricNumber(metrics.clicks)
  );
}

export function engagementRate(item?: PostQueueItem) {
  if (!item) return "0%";
  const impressions = metricNumber(item.metrics?.impressions);
  if (!impressions) return "0%";
  return `${((engagementTotal(item) / impressions) * 100).toFixed(1)}%`;
}

export function performanceRate(item: PostQueueItem) {
  const impressions = metricNumber(item.metrics?.impressions);
  if (!impressions) return 0;
  return (engagementTotal(item) / impressions) * 100;
}

export function performanceScore(item: PostQueueItem) {
  const impressions = metricNumber(item.metrics?.impressions);
  return impressions > 0 ? performanceRate(item) : engagementTotal(item);
}

export function contentEngagementTotal(item: ContentMetricItem) {
  const metrics = item.metrics ?? {};
  return (
    metricNumber(metrics.likes) +
    metricNumber(metrics.comments) +
    metricNumber(metrics.shares) +
    metricNumber(metrics.saves) +
    metricNumber(metrics.clicks)
  );
}

export function contentImpressions(item: ContentMetricItem) {
  return metricNumber(item.metrics?.impressions);
}

export function contentEngagementRate(item: ContentMetricItem) {
  const impressions = contentImpressions(item);
  if (!impressions) return "0%";
  return `${((contentEngagementTotal(item) / impressions) * 100).toFixed(1)}%`;
}

export function sortContentItems<T extends ContentMetricItem>(a: T, b: T, sortMode: string) {
  if (sortMode === "Oldest first") {
    return new Date(a.postedAt || a.createdAt).getTime() - new Date(b.postedAt || b.createdAt).getTime();
  }

  if (sortMode === "Highest engagement") {
    return contentEngagementTotal(b) - contentEngagementTotal(a);
  }

  if (sortMode === "Highest impressions") {
    return contentImpressions(b) - contentImpressions(a);
  }

  if (sortMode === "Highest readiness score") {
    return (b.readinessScore ?? 0) - (a.readinessScore ?? 0);
  }

  return new Date(b.postedAt || b.createdAt).getTime() - new Date(a.postedAt || a.createdAt).getTime();
}
