import { describe, expect, it } from 'vitest';
import { escapeSqlLiteral } from '@/utils/sql';

describe('escapeSqlLiteral', () => {
  it('escapes every single quote for a SQL string literal', () => {
    expect(escapeSqlLiteral("O'Reilly's note")).toBe("O''Reilly''s note");
  });

  it('leaves strings without single quotes unchanged', () => {
    expect(escapeSqlLiteral('plain value')).toBe('plain value');
  });
});
