// Versi web: berkas diunduh lewat tautan sementara.

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function shareTextFile(name: string, mimeType: string, content: string, _dialogTitle?: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Di browser, "bagikan" memakai Web Share bila ada; kalau tidak, gambar diunduh. */
export async function shareImage(uri: string): Promise<void> {
  const blob = await (await fetch(uri)).blob();
  const file = new File([blob], 'jejak.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Aktivitas Jejak' });
    return;
  }
  download(uri, 'jejak.png');
}

export async function saveImage(uri: string, name: string): Promise<void> {
  download(uri, name);
}

/** Di web captureRef mengembalikan data URI. */
export const CAPTURE_RESULT = 'data-uri' as const;
