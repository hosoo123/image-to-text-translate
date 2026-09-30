"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TextItem = {
  id: string;
  type: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bubbleX?: number;
  bubbleY?: number;
  bubbleWidth?: number;
  bubbleHeight?: number;
  bubbleShape?: "rounded" | "ellipse" | "rectangle" | "none";
  bubbleBackground?: "solid" | "transparent" | "none";
  character?: string;
  personality?: string[];
  speechStyle?: string;
  emotion?: string;
  relationship?: string;
  confidence?: number;
};

type PageResult = {
  file: File;
  status: "waiting" | "working" | "done" | "error";
  error?: string;
  output?: Blob;
  scene?: string;
  memory?: string;
};

const MAX_PAGES = 40;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: { name: string; blob: Blob }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const write16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const write32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);

  return Promise.all(files.map(async ({ name, blob }) => ({ name: encoder.encode(name), data: new Uint8Array(await blob.arrayBuffer()) }))).then((entries) => {
    for (const entry of entries) {
      const checksum = crc32(entry.data);
      const local = new Uint8Array(30 + entry.name.length);
      const localView = new DataView(local.buffer);
      write32(localView, 0, 0x04034b50); write16(localView, 4, 20); write16(localView, 6, 0x0800);
      write16(localView, 8, 0); write32(localView, 14, checksum); write32(localView, 18, entry.data.length);
      write32(localView, 22, entry.data.length); write16(localView, 26, entry.name.length); local.set(entry.name, 30);
      localParts.push(local, entry.data);

      const central = new Uint8Array(46 + entry.name.length);
      const centralView = new DataView(central.buffer);
      write32(centralView, 0, 0x02014b50); write16(centralView, 4, 20); write16(centralView, 6, 20);
      write16(centralView, 8, 0x0800); write16(centralView, 10, 0); write32(centralView, 16, checksum);
      write32(centralView, 20, entry.data.length); write32(centralView, 24, entry.data.length);
      write16(centralView, 28, entry.name.length); write32(centralView, 42, offset); central.set(entry.name, 46);
      centralParts.push(central);
      offset += local.length + entry.data.length;
    }
    const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    write32(endView, 0, 0x06054b50); write16(endView, 8, entries.length); write16(endView, 10, entries.length);
    write32(endView, 12, centralSize); write32(endView, 16, offset);
    const blobParts = [...localParts, ...centralParts, end].map((part) => part.slice().buffer as ArrayBuffer);
    return new Blob(blobParts, { type: "application/zip" });
  });
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG үүсгэж чадсангүй.")), "image/png"));
}

function eraseText(ctx: CanvasRenderingContext2D, bounds: { x: number; y: number; width: number; height: number }) {
  const left = Math.max(0, Math.floor(bounds.x)); const top = Math.max(0, Math.floor(bounds.y));
  const right = Math.min(ctx.canvas.width, Math.ceil(bounds.x + bounds.width));
  const bottom = Math.min(ctx.canvas.height, Math.ceil(bounds.y + bounds.height));
  if (right <= left || bottom <= top) return;
  const image = ctx.getImageData(left, top, right - left, bottom - top);
  const { width, height, data } = image;
  const mask = new Uint8Array(width * height);
  const lum = new Float32Array(width * height);
  const at = (x: number, y: number) => y * width + x;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const p = at(x, y) * 4; lum[at(x, y)] = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
  }
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let sum = 0; let n = 0;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const sx = x + dx; const sy = y + dy;
      if ((dx || dy) && sx >= 0 && sy >= 0 && sx < width && sy < height) { sum += lum[at(sx, sy)]; n += 1; }
    }
    if (n && Math.abs(lum[at(x, y)] - sum / n) > 38) mask[at(x, y)] = 1;
  }
  const expanded = new Uint8Array(mask);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (mask[at(x, y)]) {
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const sx = x + dx; const sy = y + dy;
      if (sx >= 0 && sy >= 0 && sx < width && sy < height) expanded[at(sx, sy)] = 1;
    }
  }
  const filled = new Uint8ClampedArray(data);
  for (let pass = 0; pass < 64; pass += 1) for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const pixel = at(x, y); if (!expanded[pixel]) continue;
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([sx, sy]) => sx >= 0 && sy >= 0 && sx < width && sy < height);
    for (let channel = 0; channel < 3; channel += 1) filled[pixel * 4 + channel] = neighbors.reduce((total, [sx, sy]) => total + filled[at(sx, sy) * 4 + channel], 0) / neighbors.length;
  }
  for (let pixel = 0; pixel < expanded.length; pixel += 1) if (expanded[pixel]) {
    data[pixel * 4] = filled[pixel * 4]; data[pixel * 4 + 1] = filled[pixel * 4 + 1]; data[pixel * 4 + 2] = filled[pixel * 4 + 2];
  }
  ctx.putImageData(image, left, top);
}

async function renderPage(file: File, texts: TextItem[], translations: { id: string; translation: string }[]) {
  const source = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas ажиллахгүй байна.");
  ctx.drawImage(source, 0, 0);

  for (const item of texts) {
    if (item.type.toLowerCase() !== "dialogue") continue;
    const translated = translations.find((entry) => entry.id === item.id)?.translation.trim();
    if (!translated) continue;
    const shape = item.bubbleShape ?? "none";
    const bx = item.bubbleX ?? item.x;
    const by = item.bubbleY ?? item.y;
    const bw = item.bubbleWidth ?? item.width;
    const bh = item.bubbleHeight ?? item.height;
    const solid = item.bubbleBackground !== "transparent" && item.bubbleBackground !== "none" && shape !== "none";

    if (!solid) eraseText(ctx, item);
    if (solid) {
      const samples: number[][] = [];
      const points = [[bx + bw / 2, by - 3], [bx + bw / 2, by + bh + 3], [bx - 3, by + bh / 2], [bx + bw + 3, by + bh / 2]];
      for (const [px, py] of points) {
        if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;
        samples.push(Array.from(ctx.getImageData(Math.floor(px), Math.floor(py), 1, 1).data.slice(0, 3)));
      }
      const color = [0, 1, 2].map((channel) => {
        const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
        return values[Math.floor(values.length / 2)] ?? 255;
      });
      ctx.beginPath();
      if (shape === "ellipse") ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
      else if (shape === "rounded") ctx.roundRect(bx, by, bw, bh, Math.min(bw, bh) * 0.16);
      else ctx.rect(bx, by, bw, bh);
      ctx.fillStyle = `rgb(${color.join(",")})`; ctx.fill();
    }

    const textX = shape === "none" ? item.x + item.width / 2 : bx + bw / 2;
    const textY = shape === "none" ? item.y + item.height / 2 : by + bh / 2;
    const maxWidth = (shape === "none" ? item.width : bw) * 0.82;
    let fontSize = Math.max(8, Math.min(64, bw * 0.12, bh * 0.28));
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#111";
    while (fontSize > 8) {
      ctx.font = `700 ${fontSize}px Arial`;
      if (ctx.measureText(translated).width < maxWidth) break;
      fontSize -= 1;
    }
    ctx.font = `700 ${fontSize}px Arial`;
    const words = translated.split(/\s+/); const lines: string[] = []; let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    const lineHeight = fontSize * 1.2; let y = textY - ((lines.length - 1) * lineHeight) / 2;
    if (!solid) { ctx.lineWidth = Math.max(1, fontSize * 0.12); ctx.strokeStyle = "white"; ctx.lineJoin = "round"; }
    for (const textLine of lines) {
      if (!solid) ctx.strokeText(textLine, textX, y);
      ctx.fillText(textLine, textX, y); y += lineHeight;
    }
  }
  source.close();
  return canvasBlob(canvas);
}

export default function ChapterTranslator() {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [chapterContext, setChapterContext] = useState("");
  const [message, setMessage] = useState("");
  const readyCount = useMemo(() => pages.filter((page) => page.status === "done" && page.output).length, [pages]);

  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith("image/") && file.size <= MAX_FILE_SIZE)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    if (!selected.length) { setMessage("20MB-аас бага хэмжээтэй зураг сонгоно уу."); return; }
    if (selected.length > MAX_PAGES) { setMessage(`Нэг удаад ${MAX_PAGES} хүртэл хуудас оруулна уу.`); return; }
    setFiles(selected); setPages(selected.map((file) => ({ file, status: "waiting" }))); setMessage("");
  }

  async function processChapter() {
    if (!files.length || busy) return;
    setBusy(true); setMessage("");
    let memory = "";
    let stoppedByQuota = false;
    const completed: PageResult[] = files.map((file, index) => pages[index]?.file === file && pages[index].status === "done" ? pages[index] : ({ file, status: "waiting" }));
    setPages(completed);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (completed[index].status === "done") {
        memory = [memory, completed[index].memory ?? `Хуудас ${index + 1}: ${completed[index].scene ?? ""}`]
          .filter(Boolean).join("\n").slice(-4500);
        continue;
      }
      completed[index] = { file, status: "working" }; setPages([...completed]);
      try {
        const form = new FormData(); form.append("image", file);
        const analyzeResponse = await fetch("/api/analyze", { method: "POST", body: form });
        const analysis = await analyzeResponse.json();
        if (!analyzeResponse.ok) throw new Error(analysis.error || "Зураг уншихад алдаа гарлаа.");
        const texts = analysis.texts as TextItem[];
        if (!texts?.length) throw new Error("Ярианы текст илрээгүй.");
        const scene = typeof analysis.sceneContext === "string" ? analysis.sceneContext : "";
        const context = [chapterContext.trim().slice(0, 2000), memory, `Одоогийн хуудас: ${scene}`]
          .filter(Boolean).join("\n").slice(-6000);
        const translateResponse = await fetch("/api/translate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts, sceneContext: context }),
        });
        const translated = await translateResponse.json();
        if (!translateResponse.ok) throw new Error(translated.error || "Орчуулахад алдаа гарлаа.");
        const output = await renderPage(file, texts, translated.translations ?? []);
        const dialogueMemory = texts
          .filter((item) => item.type.toLowerCase() === "dialogue")
          .map((item) => {
            const translatedText = (translated.translations as { id: string; translation: string }[])
              .find((entry) => entry.id === item.id)?.translation;
            return translatedText ? `${item.character || "Дүр"}: ${translatedText}` : "";
          })
          .filter(Boolean)
          .join("; ");
        memory = [memory, `Хуудас ${index + 1}: ${scene}`, dialogueMemory]
          .filter(Boolean).join("\n").slice(-4500);
        completed[index] = { file, status: "done", output, scene, memory };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Алдаа гарлаа.";
        completed[index] = { file, status: "error", error: reason };
        if (/лимит|quota|429/i.test(reason)) {
          stoppedByQuota = true;
          for (let remaining = index + 1; remaining < files.length; remaining += 1) {
            completed[remaining] = { file: files[remaining], status: "error", error: "Өдрийн лимит дууссан тул дараалал түр зогслоо." };
          }
          setMessage("Өдрийн AI лимит дууслаа. Бэлэн болсон хуудсуудыг татаж аваад лимит сэргэсэн үед үлдсэн хуудсыг ажиллуулна уу.");
          setPages([...completed]);
          break;
        }
      }
      setPages([...completed]);
    }
    if (!stoppedByQuota) setMessage("Хуудас боловсруулах ажил дууслаа.");
    setBusy(false);
  }

  async function downloadZip() {
    const ready = pages.filter((page) => page.status === "done" && page.output);
    if (!ready.length) return;
    const zip = await createZip(ready.map((page) => {
      const pageNumber = String(pages.indexOf(page) + 1).padStart(3, "0");
      return { name: `page-${pageNumber}-${page.file.name.replace(/\.[^.]+$/, "")}-mn.png`, blob: page.output! };
    }));
    const url = URL.createObjectURL(zip); const link = document.createElement("a");
    link.href = url; link.download = "manhwa-chapter-mn.zip"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="min-h-svh px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/workspace" className="text-sm text-lime-300">← Орчуулгын хэсэг</Link>
        <header className="mt-6 border-b border-white/10 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Chapter mode</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Бүлэг орчуулах</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Хуудаснуудаа унших дарааллаар сонгоно. AI тэдгээрийг нэг нэгээр нь уншиж, өмнөх хуудасны scene мэдээллийг дараагийн орчуулгад ашиглана.</p>
        </header>
        <section className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
          <label className="block text-sm font-semibold">Бүлгийн хуудаснууд
            <input type="file" accept="image/*" multiple onChange={selectFiles} disabled={busy} className="mt-3 block min-h-12 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-lime-300 file:px-3 file:py-2 file:font-semibold file:text-black" />
          </label>
          <label className="block text-sm font-semibold">Өмнөх бүлгээс мэдэх дүр, нэр томьёо <span className="font-normal text-zinc-500">(сонголтоор)</span>
            <textarea value={chapterContext} onChange={(event) => setChapterContext(event.target.value)} rows={3} disabled={busy} placeholder="Дүрийн нэр, харилцаа, тогтмол хэллэг..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm font-normal outline-none focus:border-lime-300/50" />
          </label>
          {files.length > 0 && <p className="text-xs leading-5 text-zinc-500">{files.length} хуудас сонгогдлоо. Хуудасны нэрээр (1, 2, 10 гэх мэт) дарааллуулсан; файлын нэрэнд дугаар байвал дарааллыг нь нягтлаарай. Нэг зураг 20MB хүртэл.</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={processChapter} disabled={busy || !files.length} className="min-h-12 flex-1 rounded-xl bg-lime-300 px-5 py-3 font-bold text-black disabled:opacity-50">{busy ? "Хуудсуудыг дарааллаар орчуулж байна…" : "Бүлгийг орчуулж эхлэх"}</button>
            <button type="button" onClick={downloadZip} disabled={!readyCount || busy} className="min-h-12 rounded-xl border border-white/15 px-5 py-3 font-semibold disabled:opacity-40">{readyCount} хуудас ZIP татах</button>
          </div>
          {message && <p role="status" className="text-sm leading-6 text-lime-100">{message}</p>}
        </section>
        {pages.length > 0 && <ol className="mt-5 space-y-2">{pages.map((page, index) => <li key={`${page.file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm"><span className="min-w-0 truncate">{String(index + 1).padStart(2, "0")} · {page.file.name}</span><span className={page.status === "done" ? "shrink-0 text-lime-300" : page.status === "error" ? "shrink-0 text-red-300" : "shrink-0 text-zinc-500"}>{page.status === "done" ? "Бэлэн" : page.status === "error" ? page.error : page.status === "working" ? "Уншиж байна…" : "Хүлээж байна"}</span></li>)}</ol>}
        <p className="mt-5 text-xs leading-5 text-zinc-500">Хуудас бүр зураг унших болон орчуулгын тусдаа AI хүсэлт ашиглана. Лимит хүрвэл өмнө бэлэн болсон хуудсууд хадгалагдаж, ZIP татаж болно.</p>
      </div>
    </main>
  );
}
