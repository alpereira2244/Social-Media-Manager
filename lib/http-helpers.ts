export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function readJsonResponse(response: Response, fallbackMessage: string) {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 413 || /request entity too large|payload too large/i.test(text)) {
      throw new Error(
        "The uploaded image is too large to send for AI generation. Use mock fallback, add media notes, or upload a smaller image."
      );
    }

    throw new Error(`${fallbackMessage}: ${text.slice(0, 120)}`);
  }
}
