import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const uploadsRoot = path.resolve(process.cwd(), "uploads");
export const coversRoot = path.join(uploadsRoot, "covers");
export const messagesRoot = path.join(uploadsRoot, "messages");
export const pageAudioRoot = path.join(uploadsRoot, "page-audio");
export const wishAudioRoot = path.join(uploadsRoot, "wish-audio");

for (const dir of [uploadsRoot, coversRoot, messagesRoot, pageAudioRoot, wishAudioRoot]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildFilename(originalName: string) {
  const extension = path.extname(originalName).toLowerCase() || ".jpg";
  return `${crypto.randomUUID()}${extension}`;
}

function imageFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are supported"));
    return;
  }

  callback(null, true);
}

function audioFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) {
  if (!file.mimetype.startsWith("audio/")) {
    callback(new Error("Only audio uploads are supported"));
    return;
  }

  callback(null, true);
}

export const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, coversRoot),
    filename: (_request, file, callback) => callback(null, buildFilename(file.originalname)),
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const messageUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, messagesRoot),
    filename: (_request, file, callback) => callback(null, buildFilename(file.originalname)),
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: imageFileFilter,
});

export const pageAudioUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, pageAudioRoot),
    filename: (_request, file, callback) => callback(null, buildFilename(file.originalname)),
  }),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: audioFileFilter,
});

export const wishAudioUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, wishAudioRoot),
    filename: (_request, file, callback) => callback(null, buildFilename(file.originalname)),
  }),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: audioFileFilter,
});

export function fileUrl(relativePath: string) {
  return `/uploads/${relativePath.replaceAll("\\", "/")}`;
}

export function removeFileByUrl(url?: string | null) {
  if (!url || !url.startsWith("/uploads/")) return;

  const filePath = path.resolve(process.cwd(), url.replace("/uploads/", "uploads/"));
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}
