/**
 * Downloads a video file to the device.
 *
 * Mobile (any): opens the presigned URL directly in a new tab.
 * iOS Safari will show a native player with "Save Video" → camera roll.
 * Android Chrome will trigger a download.
 *
 * Desktop: fetches as blob for a forced Save dialog with progress tracking.
 */

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export async function downloadVideo(
  url: string,
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const safeFilename = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;

  // Mobile: open directly — avoids async blob fetch which loses the user
  // gesture context and gets silently blocked by iOS/Android browsers.
  if (isMobile()) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Desktop: blob fetch → forced Save dialog with progress
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