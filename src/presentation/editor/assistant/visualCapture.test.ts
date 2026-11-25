import { describe, expect, it, vi } from 'vitest';
import type { ProjectDocument } from '@domain/entities/screen';
import { makeScreen, makeText } from '@test/editorFixtures';
import {
  buildCapturePlan,
  captureKey,
  captureScreenFrames,
  dataUrlToBase64,
} from './visualCapture';

const DOCUMENT: ProjectDocument = {
  schemaVersion: 14,
  id: 'project_1',
  name: 'Tasks',
  createdAt: '2026-11-25T00:00:00.000Z',
  updatedAt: '2026-11-25T00:00:00.000Z',
  screens: [
    makeScreen('home', [makeText('heading')], 'Home'),
    makeScreen('create', [makeText('title')], 'Create'),
    makeScreen('detail', [makeText('detail')], 'Detail'),
  ],
} as ProjectDocument;

describe('visualCapture', () => {
  it('builds the same bounded mobile/tablet/desktop plan for the first two screens', () => {
    const plan = buildCapturePlan(DOCUMENT);
    expect(plan).toHaveLength(6);
    expect(plan.map(captureKey)).toEqual([
      'home:mobile', 'home:tablet', 'home:desktop',
      'create:mobile', 'create:tablet', 'create:desktop',
    ]);
  });

  it('converts only valid PNG data URLs into Base64 payloads', () => {
    expect(dataUrlToBase64('data:image/png;base64,aGVsbG8=')).toBe('aGVsbG8=');
    expect(() => dataUrlToBase64('https://example.com/image.png')).toThrow(/data URL/);
    expect(() => dataUrlToBase64('data:image/png;base64,not*base64')).toThrow(/invalid image data/);
  });

  it('captures each offscreen frame in memory with deterministic mocks', async () => {
    const container = document.createElement('div');
    for (const request of buildCapturePlan(DOCUMENT)) {
      const node = document.createElement('div');
      node.dataset.captureKey = captureKey(request);
      container.appendChild(node);
    }
    const capture = vi.fn().mockResolvedValue('data:image/png;base64,aGVsbG8=');

    const captures = await captureScreenFrames(container, buildCapturePlan(DOCUMENT), capture);

    expect(captures).toHaveLength(6);
    expect(captures.map((item) => item.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(captures[0]).toMatchObject({
      screenKey: 'home',
      viewport: 'mobile',
      name: 'home_mobile.png',
      mimeType: 'image/png',
      contentBase64: 'aGVsbG8=',
    });
    expect(capture).toHaveBeenCalledTimes(6);
    expect(capture.mock.calls[0]?.[1]).toBe(390);
    expect(capture.mock.calls[1]?.[1]).toBe(768);
    expect(capture.mock.calls[2]?.[1]).toBe(1200);
  });

  it('fails closed for missing frames and oversized captures', async () => {
    const empty = document.createElement('div');
    await expect(captureScreenFrames(empty, buildCapturePlan(DOCUMENT).slice(0, 1), vi.fn()))
      .rejects.toThrow(/was not ready/);

    const container = document.createElement('div');
    const node = document.createElement('div');
    node.dataset.captureKey = 'home:mobile';
    container.appendChild(node);
    const oversized = vi.fn().mockResolvedValue(`data:image/png;base64,${'a'.repeat(4 * 1024 * 1024 + 1)}`);
    await expect(captureScreenFrames(container, buildCapturePlan(DOCUMENT).slice(0, 1), oversized))
      .rejects.toThrow(/too large/);
  });
});
