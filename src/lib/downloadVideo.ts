/**
 * Downloads a video file to the device.
 * Fetches as blob so mobile browsers save to Files/Downloads
 * instead of playing inline. Falls back to direct link on error.
 */
export async function downloadVideo(
  url: string,
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
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
    a.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Small delay before revoking so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // Fallback: direct link (better than nothing)
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}