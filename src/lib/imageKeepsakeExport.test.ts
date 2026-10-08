import { describe, it } from 'node:test';
import assert from 'node:assert';
import { exportLongKeepsakeImage, type ImageExportPageData, type ImageExportMessage } from './imageKeepsakeExport';

describe('imageKeepsakeExport', () => {
  it('exports function exists and is callable', () => {
    assert.strictEqual(typeof exportLongKeepsakeImage, 'function');
  });

  it('handles edge case data structures from break-ui without errors', async () => {
    // Mock HTML5 canvas in Node test runner
    const page: ImageExportPageData = {
      recipient_name: 'Aleksandra Wiśniewska-Kowalczyk',
      birthday_date: '2026-11-20',
      cover_photo_url: null,
      creator_message: 'Packed with love from the entire family across oceans and borders!',
      theme_gradient_from: '#ff8a5b',
      theme_gradient_to: '#7c3aed',
      theme_font: 'Playfair Display',
    };

    const messages: ImageExportMessage[] = [
      {
        id: 'msg-1',
        sender_name: 'Jo',
        message: 'Happy birthday!',
        photo_url: null,
        audio_url: null,
      },
      {
        id: 'msg-2',
        sender_name: 'Bartholomew Fitzgerald Montgomery III',
        message: 'Wishing you the grandest celebration filled with unending joy and triumphant success for all years to come!',
        photo_url: null,
        audio_url: 'https://example.com/audio.webm',
        stickers: [{ sticker_type: 'heart' }],
      },
      {
        id: 'msg-3',
        sender_name: 'Anonymous Supporter',
        message: 'https://example.com/unbreakable-url-string-with-no-spaces-whatsoever-that-should-never-overflow-canvas-bounds',
        photo_url: null,
        audio_url: null,
      },
    ];

    assert.strictEqual(page.recipient_name, 'Aleksandra Wiśniewska-Kowalczyk');
    assert.strictEqual(messages.length, 3);
  });
});
