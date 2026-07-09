import assert from "node:assert/strict";

const baseUrl = (process.env.SCC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const timeoutMs = Number(process.env.SCC_SMOKE_TIMEOUT_MS || 20000);

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    assert.equal(response.ok, true, `${path} returned ${response.status}: ${JSON.stringify(body)}`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function runStep(name, fn) {
  const startedAt = Date.now();
  await fn();
  return {
    name,
    ok: true,
    durationMs: Date.now() - startedAt
  };
}

const steps = [];

try {
  steps.push(await runStep("app shell responds", async () => {
    const html = await request("/", { headers: { Accept: "text/html" } });
    assert.match(html, /Conduit Social Command Center/i);
  }));

  steps.push(await runStep("website source routes to the Conduit Brain", async () => {
    const result = await request("/api/intake/classify-source", {
      method: "POST",
      body: JSON.stringify({
        title: "Conduit product page",
        inputType: "URL",
        url: "https://www.conduit.ai/product"
      })
    });
    assert.equal(result.ok, true);
    assert.equal(result.classification.recommendedDestination, "Company Knowledge");
    assert.equal(result.classification.canFetchWebsite, true);
  }));

  steps.push(await runStep("social post is saved as an opportunity without scraping", async () => {
    const result = await request("/api/intake/classify-source", {
      method: "POST",
      body: JSON.stringify({
        title: "Interesting automation post",
        inputType: "URL",
        url: "https://www.linkedin.com/posts/example_automation-activity-123456789"
      })
    });
    assert.equal(result.ok, true);
    assert.equal(result.classification.recommendedDestination, "Opportunity Inbox");
    assert.equal(result.classification.isSocial, true);
    assert.equal(result.classification.canFetchWebsite, false);
  }));

  steps.push(await runStep("raw idea routes into Create Post", async () => {
    const result = await request("/api/intake/classify-source", {
      method: "POST",
      body: JSON.stringify({
        title: "Factory floor deployment lesson",
        inputType: "Raw post idea",
        text: "Explain why deployment work starts with the real operator workflow."
      })
    });
    assert.equal(result.ok, true);
    assert.equal(result.classification.recommendedDestination, "Create Post / Content Brief");
  }));

  steps.push(await runStep("opportunity analysis returns an actionable recommendation", async () => {
    const result = await request("/api/opportunities/analyze", {
      method: "POST",
      body: JSON.stringify({
        title: "Question about automation deployment",
        opportunityType: "Reply opportunity",
        platform: "LinkedIn",
        pastedText: "How do manufacturers connect robots to existing operator workflows?"
      })
    });
    assert.equal(result.ok, true);
    assert.ok(result.analysis.suggestedConduitAngle);
    assert.ok(result.analysis.suggestedFirstDraftIdea);
    assert.ok(Array.isArray(result.analysis.suggestedPlatforms));
  }));

  steps.push(await runStep("brand safety catches unsupported hype", async () => {
    const result = await request("/api/brand-safety", {
      method: "POST",
      body: JSON.stringify({
        postCopy: "Conduit always eliminates every deployment problem and guarantees outcomes.",
        platform: "LinkedIn",
        campaign: {
          name: "Smoke test",
          knowledgeSources: [],
          claimLibrary: {
            approvedClaims: [],
            needsReviewClaims: [],
            doNotSayClaims: ["Conduit guarantees automation outcomes."]
          }
        }
      })
    });
    assert.equal(result.ok, true);
    assert.notEqual(result.check.status, "Safe");
    assert.ok(result.check.notes.length > 0);
  }));

  console.log(JSON.stringify({ ok: true, baseUrl, steps }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    baseUrl,
    steps,
    error: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exitCode = 1;
}
