/**
 * Downloads a video file to the device.
 *
 * iOS Safari: opens the presigned URL in a new tab so the native player
 * shows a "Save Video" button → saves directly to the camera roll.
 *
 * Android / desktop: fetches as blob and triggers a Save dialog to the
 * Downloads folder, with optional progress callback.
 */

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // Safari on iOS — excludes Chrome/Firefox on iOS which use a different engine
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export async function downloadVideo(
  url: string,
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // iOS Safari: open directly so native player offers "Save Video" → camera roll
  if (isIosSafari()) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Android / desktop: blob fetch → forced Save dialog
  const safeFilename = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const contentLength = res.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = res.body?.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let received = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total && onProgress) onProgress(Math.round((received / total) * 100));
      }
    }

    const blob = new Blob(chunks, { type: "video/mp4" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // Fallback: direct link
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}