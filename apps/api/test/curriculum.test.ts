import { describe, it, expect } from 'vitest';
import { validateCurriculum } from '../src/curriculum/validate.js';
import { grade4Math } from '../src/curriculum/grade4-math.js';
import type { CurriculumDef, TopicDef } from '../src/curriculum/types.js';

function curriculumWith(topics: TopicDef[]): CurriculumDef {
  return { subject: { slug: 'test', nameHe: 'בדיקה' }, topics };
}

const topic = (slug: string, extra: Partial<TopicDef> = {}): TopicDef => ({
  slug,
  nameHe: slug,
  grade: 4,
  ...extra,
});

describe('grade 4 math curriculum', () => {
  it('is valid', () => {
    expect(validateCurriculum(grade4Math)).toEqual([]);
  });
});

describe('validateCurriculum', () => {
  it('accepts a simple valid tree', () => {
    const c = curriculumWith([topic('a'), topic('b', { parent: 'a', prerequisites: ['a'] })]);
    expect(validateCurriculum(c)).toEqual([]);
  });

  it('rejects duplicate slugs', () => {
    const errors = validateCurriculum(curriculumWith([topic('a'), topic('a')]));
    expect(errors).toContain('Duplicate slug: "a"');
  });

  it('rejects a parent that is missing', () => {
    const errors = validateCurriculum(curriculumWith([topic('a', { parent: 'nope' })]));
    expect(errors).toHaveLength(1);
  });

  it('rejects a parent listed after its child', () => {
    const errors = validateCurriculum(curriculumWith([topic('child', { parent: 'parent' }), topic('parent')]));
    expect(errors).toHaveLength(1);
  });

  it('rejects an unknown prerequisite', () => {
    const errors = validateCurriculum(curriculumWith([topic('a', { prerequisites: ['nope'] })]));
    expect(errors).toEqual(['Topic "a" has unknown prerequisite "nope"']);
  });

  it('rejects a topic that is its own prerequisite', () => {
    const errors = validateCurriculum(curriculumWith([topic('a', { prerequisites: ['a'] })]));
    expect(errors).toEqual(['Topic "a" lists itself as a prerequisite']);
  });

  it('rejects a prerequisite cycle across several topics', () => {
    const errors = validateCurriculum(
      curriculumWith([topic('a', { prerequisites: ['c'] }), topic('b', { prerequisites: ['a'] }), topic('c', { prerequisites: ['b'] })]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Prerequisite cycle');
  });

  it('allows a topic needed by two others (not a cycle)', () => {
    const c = curriculumWith([topic('base'), topic('x', { prerequisites: ['base'] }), topic('y', { prerequisites: ['base', 'x'] })]);
    expect(validateCurriculum(c)).toEqual([]);
  });
});
