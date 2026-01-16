import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/vue';
import '@testing-library/jest-dom/vitest';

// 在每个测试之前清理DOM
beforeEach(() => {
  // 任何测试前需要的设置
});

// 在每个测试之后清理
afterEach(() => {
  cleanup();
});