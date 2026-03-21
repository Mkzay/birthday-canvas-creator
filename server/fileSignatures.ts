import fs from "node:fs/promises";

/**
 * Verify file content matches a real image (not MIME spoofing).
 */
export async function validateImageMagicBytes(filePath: string): Promise<boolean> {
  const buf = Buffer.alloc(16);
  const handle = await fs.open(filePath, "r");
  try {
    const { bytesRead } = await handle.read(buf, 0, 16, 0);
    if (bytesRead < 3) return false;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    if (bytesRead >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    if (bytesRead >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
    if (bytesRead >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return true;
  } finally {
    await handle.close();
  }
  return false;
}

/**
 * Verify file content matches common audio containers (voice notes, uploads).
 */
export async function validateAudioMagicBytes(filePath: string): Promise<boolean> {
  const buf = Buffer.alloc(36);
  const handle = await fs.open(filePath, "r");
  try {
    const { bytesRead } = await handle.read(buf, 0, 36, 0);
    if (bytesRead < 4) return false;
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
    if (bytesRead >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") return true;
    if (buf.toString("ascii", 0, 4) === "OggS") return true;
    if (buf.toString("ascii", 0, 4) === "fLaC") return true;
    if (bytesRead >= 12 && buf.toString("ascii", 4, 8) === "ftyp") return true;
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true;
  } finally {
    await handle.close();
  }
  return false;
}
