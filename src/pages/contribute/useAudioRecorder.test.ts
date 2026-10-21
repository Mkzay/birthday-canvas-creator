import assert from 'node:assert/strict';
import { after, test, mock } from 'node:test';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useAudioRecorder, type UseAudioRecorderReturn } from './useAudioRecorder';
import { toast } from 'sonner';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
let stopped = 0;
let failConstruction = false;
let denied = false;
let recorder: FakeRecorder;
const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
class FakeRecorder {
  static isTypeSupported() { return false; }
  mimeType = 'audio/mp4';
  state = 'inactive';
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  // The fake exposes the created browser recorder to lifecycle tests.
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  constructor() { if (failConstruction) throw new Error('unsupported encoder'); recorder = this; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['recorded audio'], { type: this.mimeType }) }); this.onstop?.(); }
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { if (denied) throw new Error('permission denied'); return stream; } } } });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval } });
Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeRecorder });
mock.method(toast, 'error', () => 'test-toast');
after(() => {
  mock.restoreAll();
  for (const [key, descriptor] of [['navigator', originalNavigator], ['window', originalWindow], ['MediaRecorder', originalRecorder]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
  }
});
let current: UseAudioRecorderReturn;
function Harness() { current = useAudioRecorder(); return null; }
async function withHook(run: () => Promise<void>) {
  let renderer: ReactTestRenderer;
  stopped = 0; failConstruction = false; denied = false;
  await act(async () => { renderer = create(React.createElement(Harness)); });
  try { await run(); } finally { await act(async () => { renderer!.unmount(); }); }
}
test('cancelling a recording discards it instead of saving a zero-length voice note', () => withHook(async () => {
  await act(async () => { await current.startRecording(); });
  await act(async () => { current.cancelRecording(); });
  assert.equal(current.wishAudio, null);
  assert.equal(current.isRecording, false);
  assert.ok(stopped > 0);
}));
test('recording uses the recorder actual MIME type when no preferred type is available', () => withHook(async () => {
  await act(async () => { await current.startRecording(); });
  await act(async () => { current.stopRecording(); });
  assert.equal(current.wishAudio?.type, 'audio/mp4');
  assert.equal(current.wishAudio?.name, 'voice-note.m4a');
}));
test('encoder setup failure releases the microphone', () => withHook(async () => {
  failConstruction = true;
  await act(async () => { await current.startRecording(); });
  assert.ok(stopped > 0);
  assert.equal(current.isRecording, false);
}));
test('microphone denial is recoverable without creating an audio file', () => withHook(async () => {
  denied = true;
  await act(async () => { await current.startRecording(); });
  assert.equal(current.isRecording, false);
  assert.equal(current.wishAudio, null);
}));
test('audio file size matches the server eight-megabyte limit', () => withHook(async () => {
  await act(async () => { current.setAudioFromFile(new File([new Uint8Array(9 * 1024 * 1024)], 'too-large.mp3', { type: 'audio/mpeg' })); });
  assert.equal(current.wishAudio, null);
}));
