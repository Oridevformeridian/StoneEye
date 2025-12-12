import { describe, test, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import GameIcon from '../../src/components/GameIcon.jsx';

describe('GameIcon Component', () => {
  test('renders with iconId', () => {
    const { container } = render(<GameIcon iconId={1000} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('icon_1000.png');
  });

  test('applies default size classes', () => {
    const { container } = render(<GameIcon iconId={1000} />);
    const wrapper = container.querySelector('div');
    expect(wrapper.className).toContain('w-8');
    expect(wrapper.className).toContain('h-8');
  });

  test('applies custom size', () => {
    const { container } = render(<GameIcon iconId={1000} size="w-16 h-16" />);
    const wrapper = container.querySelector('div');
    expect(wrapper.className).toContain('w-16');
    expect(wrapper.className).toContain('h-16');
  });

  test('applies custom className', () => {
    const { container } = render(<GameIcon iconId={1000} className="custom-class" />);
    const wrapper = container.querySelector('div');
    expect(wrapper.className).toContain('custom-class');
  });

  test('handles CDN failure gracefully', async () => {
    const { container } = render(<GameIcon iconId={9999999} />);
    const img = container.querySelector('img');
    
    // Simulate image load error
    fireEvent.error(img);
    
    await waitFor(() => {
      expect(img.style.display).toBe('none');
    });
  });

  test('returns null when iconId is not provided', () => {
    const { container } = render(<GameIcon />);
    expect(container.querySelector('div')).toBeFalsy();
  });

  test('returns null when iconId is null', () => {
    const { container } = render(<GameIcon iconId={null} />);
    expect(container.querySelector('div')).toBeFalsy();
  });

  test('returns null when iconId is 0', () => {
    const { container } = render(<GameIcon iconId={0} />);
    expect(container.querySelector('div')).toBeFalsy();
  });

  test('constructs correct CDN URL', () => {
    const { container } = render(<GameIcon iconId={5432} />);
    const img = container.querySelector('img');
    expect(img.src).toBe('https://cdn.projectgorgon.com/v439/icons/icon_5432.png');
  });

  test('has correct styling classes', () => {
    const { container } = render(<GameIcon iconId={1000} />);
    const wrapper = container.querySelector('div');
    expect(wrapper.className).toContain('bg-slate-800');
    expect(wrapper.className).toContain('rounded');
    expect(wrapper.className).toContain('border');
    expect(wrapper.className).toContain('border-slate-700');
    expect(wrapper.className).toContain('shrink-0');
    expect(wrapper.className).toContain('overflow-hidden');
  });

  test('image has correct classes', () => {
    const { container } = render(<GameIcon iconId={1000} />);
    const img = container.querySelector('img');
    expect(img.className).toContain('w-full');
    expect(img.className).toContain('h-full');
    expect(img.className).toContain('object-cover');
  });
});
