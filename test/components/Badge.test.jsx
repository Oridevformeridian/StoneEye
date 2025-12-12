import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import Badge from '../../src/components/Badge.jsx';

describe('Badge Component', () => {
  test('renders children correctly', () => {
    const { container } = render(<Badge>Test Badge</Badge>);
    expect(container.textContent).toBe('Test Badge');
  });

  test('applies default color (slate)', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('bg-slate-800');
    expect(badge.className).toContain('text-slate-300');
    expect(badge.className).toContain('border-slate-700');
  });

  test('applies indigo color', () => {
    const { container } = render(<Badge color="indigo">Indigo</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('bg-indigo-900/40');
    expect(badge.className).toContain('text-indigo-300');
    expect(badge.className).toContain('border-indigo-800');
  });

  test('applies emerald color', () => {
    const { container } = render(<Badge color="emerald">Emerald</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('bg-emerald-900/40');
    expect(badge.className).toContain('text-emerald-300');
  });

  test('applies amber color', () => {
    const { container } = render(<Badge color="amber">Amber</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('bg-amber-900/40');
    expect(badge.className).toContain('text-amber-300');
  });

  test('applies red color', () => {
    const { container } = render(<Badge color="red">Red</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('bg-red-900/40');
    expect(badge.className).toContain('text-red-300');
  });

  test('falls back to slate for invalid color', () => {
    const { container } = render(<Badge color="invalid">Fallback</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('bg-slate-800');
  });

  test('has correct base styling', () => {
    const { container } = render(<Badge>Styled</Badge>);
    const badge = container.querySelector('span');
    expect(badge.className).toContain('px-2');
    expect(badge.className).toContain('py-1');
    expect(badge.className).toContain('rounded');
    expect(badge.className).toContain('text-[10px]');
    expect(badge.className).toContain('uppercase');
    expect(badge.className).toContain('font-bold');
    expect(badge.className).toContain('border');
  });

  test('renders with numeric children', () => {
    const { container } = render(<Badge>{42}</Badge>);
    expect(container.textContent).toBe('42');
  });

  test('renders with React element children', () => {
    const { container } = render(<Badge><span>Nested</span></Badge>);
    expect(container.textContent).toBe('Nested');
  });
});
