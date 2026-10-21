import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { Readable, Writable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import { createCloudinaryStorage } from './cloudinaryStorage';

test('Cloudinary storage preserves URL/public ID and uses an image-only resource type', async () => {
  let options: Record<string, unknown> = {};
  mock.method(cloudinary.uploader, 'upload_stream', (opts: Record<string, unknown>, done: (error: Error | null, result?: object) => void) => {
    options = opts;
    return new Writable({ write(_chunk, _encoding, next) { next(); }, final(next) { done(null, { secure_url: 'https://res.cloudinary.com/test/image/upload/cover.jpg', public_id: 'birthday-app/covers/cover', bytes: 4 }); next(); } });
  });
  try {
    const storage = createCloudinaryStorage('covers');
    const result = await new Promise<Partial<Express.Multer.File>>((resolve, reject) => storage._handleFile({} as never, { stream: Readable.from([Buffer.from([0xff, 0xd8, 0xff, 0xe0])]) } as Express.Multer.File, (error, info) => error ? reject(error) : resolve(info)));
    assert.equal(options.resource_type, 'image');
    assert.equal(options.folder, 'birthday-app/covers');
    assert.equal(result.filename, 'birthday-app/covers/cover');
    assert.equal(result.size, 4);
    assert.ok(result.path?.startsWith('https://res.cloudinary.com/'));
  } finally { mock.restoreAll(); }
});

test('audio uses video resource type and provider errors reach Multer once', async () => {
  let options: Record<string, unknown> = {};
  mock.method(cloudinary.uploader, 'upload_stream', (opts: Record<string, unknown>, done: (error: Error) => void) => {
    options = opts;
    return new Writable({ write(_chunk, _encoding, next) { const error = new Error('provider unavailable'); done(error); next(error); } });
  });
  try {
    const storage = createCloudinaryStorage('wish-audio', true);
    const error = await new Promise<Error>((resolve) => storage._handleFile({} as never, { stream: Readable.from([Buffer.from('OggS test audio')]) } as Express.Multer.File, (err) => resolve(err)));
    assert.equal(error.message, 'provider unavailable');
    assert.equal(options.resource_type, 'video');
  } finally { mock.restoreAll(); }
});

test('Multer cleanup deletes the exact Cloudinary public ID with its resource type', async () => {
  const calls: unknown[][] = [];
  mock.method(cloudinary.uploader, 'destroy', async (...args: unknown[]) => { calls.push(args); return { result: 'ok' }; });
  try {
    const storage = createCloudinaryStorage('wish-audio', true);
    await new Promise<void>((resolve, reject) => storage._removeFile({} as never, { filename: 'birthday-app/wish-audio/clip' } as Express.Multer.File, (err) => err ? reject(err) : resolve()));
    assert.deepEqual(calls[0], ['birthday-app/wish-audio/clip', { resource_type: 'video' }]);
  } finally { mock.restoreAll(); }
});
