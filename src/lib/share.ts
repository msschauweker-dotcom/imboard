'use client';
// Shareable results: plain text (for group chats) + a rendered PNG card.

export type ShareCard = {
  game: string;
  title: string; // e.g. "KRILLION #315"
  big: string; // headline stat e.g. "540 pts"
  sub?: string; // e.g. "2 Deep Cuts · Personal best"
  grid?: string[][]; // rows of colors for a mosaic
  accent: string;
};

export function siteUrl(): string {
  if (typeof window === 'undefined') return 'offgrid';
  return window.location.origin;
}

export async function renderCard(card: ShareCard): Promise<Blob | null> {
  const W = 1080, H = 1080;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#0A0A0A';
  g.fillRect(0, 0, W, H);
  // grid texture
  g.strokeStyle = 'rgba(242,240,233,0.05)';
  g.lineWidth = 2;
  for (let i = 0; i <= W; i += 60) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
  // wordmark
  g.fillStyle = '#F2F0E9';
  g.font = '700 54px "Space Grotesk", system-ui, sans-serif';
  g.textBaseline = 'top';
  g.fillText('OFF', 80, 80);
  const w1 = g.measureText('OFF').width;
  g.fillStyle = '#C8FF00';
  g.fillRect(80 + w1 + 8, 92, 14, 34);
  g.fillStyle = '#F2F0E9';
  g.fillText('GRID', 80 + w1 + 30, 80);
  g.font = '500 24px "JetBrains Mono", monospace';
  g.fillStyle = '#7D7A72';
  g.fillText('THINK FOR YOURSELF.', 80, 150);
  // title
  g.fillStyle = card.accent;
  g.font = '700 46px "Space Grotesk", system-ui, sans-serif';
  g.fillText(card.title.toUpperCase(), 80, 260);
  g.fillStyle = '#F2F0E9';
  g.font = '700 150px "Space Grotesk", system-ui, sans-serif';
  g.fillText(card.big, 72, 320);
  if (card.sub) {
    g.fillStyle = '#B9B6AC';
    g.font = '500 34px Inter, system-ui, sans-serif';
    g.fillText(card.sub, 80, 490);
  }
  if (card.grid?.length) {
    const rows = card.grid.length;
    const cols = Math.max(...card.grid.map((r) => r.length));
    const cell = Math.min(64, Math.floor(420 / Math.max(rows, 1)), Math.floor(900 / Math.max(cols, 1)));
    const gap = Math.max(6, Math.round(cell * 0.14));
    card.grid.forEach((row, y) => row.forEach((col, x) => {
      g.fillStyle = col;
      roundRect(g, 80 + x * (cell + gap), 580 + y * (cell + gap), cell, cell, 8);
    }));
  }
  g.fillStyle = '#7D7A72';
  g.font = '500 26px "JetBrains Mono", monospace';
  g.fillText(siteUrl().replace(/^https?:\/\//, ''), 80, H - 100);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}

/** Uses the native share sheet with the image when available; otherwise downloads it. */
export async function shareImage(card: ShareCard, text: string): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await renderCard(card);
  if (!blob) return 'failed';
  const file = new File([blob], `offgrid-${card.game}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text });
      return 'shared';
    }
  } catch {
    /* user cancelled or unsupported — fall back to download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
