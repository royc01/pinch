import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getDefaultDocumentIconValue,
  getDefaultNotebookIconValue,
  normalizeDocumentIconValue
} from './documentIcon';

const originalSiyuan = window.siyuan;

describe('default SiYuan file-tree icons', () => {
  beforeEach(() => {
    (window as any).siyuan = {
      config: {
        fileTree: {
          useSVGDefaultIcon: false
        }
      }
    };
  });

  afterAll(() => {
    window.siyuan = originalSiyuan;
  });

  it('uses emoji defaults when SVG defaults are disabled', () => {
    expect(getDefaultDocumentIconValue()).toBe('📄');
    expect(getDefaultNotebookIconValue()).toBe('🗃');
  });

  it('uses SiYuan SVG symbols when SVG defaults are enabled', () => {
    (window.siyuan as any).config.fileTree.useSVGDefaultIcon = true;

    expect(getDefaultDocumentIconValue()).toBe('#iconFile');
    expect(getDefaultNotebookIconValue()).toBe('#iconNotebook');
  });

  it('preserves SVG symbol references while normalizing icons', () => {
    expect(normalizeDocumentIconValue('#iconFile')).toBe('#iconFile');
    expect(normalizeDocumentIconValue('#iconNotebook')).toBe('#iconNotebook');
  });
});
