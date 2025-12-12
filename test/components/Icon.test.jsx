import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Icon from '../../src/components/Icon.jsx';

describe('Icon Component', () => {
  test('renders with valid icon name', () => {
    const { container } = render(<Icon name="home" className="test-class" />);
    expect(container.querySelector('.test-class')).toBeTruthy();
  });

  test('applies className correctly', () => {
    const { container } = render(<Icon name="user" className="w-6 h-6 text-blue-500" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // SVG elements in jsdom have className as an object (SVGAnimatedString)
    const classValue = svg.getAttribute('class') || svg.className.baseVal || svg.className;
    expect(classValue).toContain('w-6');
    expect(classValue).toContain('h-6');
    expect(classValue).toContain('text-blue-500');
  });

  test('handles kebab-case icon names', () => {
    const { container } = render(<Icon name="arrow-left" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  test('handles missing icon gracefully', () => {
    const { container} = render(<Icon name="nonexistent-icon-name" />);
    expect(container.querySelector('svg')).toBeFalsy();
  });

  test('renders without className', () => {
    const { container } = render(<Icon name="star" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  test('passes additional props to icon', () => {
    const { container } = render(
      <Icon name="heart" data-testid="custom-icon" strokeWidth={3} />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('data-testid')).toBe('custom-icon');
  });

  test('handles empty name gracefully', () => {
    const { container } = render(<Icon name="" />);
    expect(container.querySelector('svg')).toBeFalsy();
  });

  test('handles null name gracefully', () => {
    const { container } = render(<Icon name={null} />);
    expect(container.querySelector('svg')).toBeFalsy();
  });
});
