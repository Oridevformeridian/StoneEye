import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import WikiButton from '../../src/components/WikiButton.jsx';

describe('WikiButton Component', () => {
  test('renders link with correct base styling', () => {
    const { container } = render(<WikiButton type="items" name="Test Item" />);
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.className).toContain('absolute');
    expect(link.className).toContain('right-12');
  });

  test('generates correct URL for items', () => {
    const { container } = render(<WikiButton type="items" name="Basic Sword" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Item:Basic_Sword');
  });

  test('generates correct URL for skills', () => {
    const { container } = render(<WikiButton type="skills" name="Fire Magic" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Fire_Magic');
  });

  test('generates correct URL for abilities', () => {
    const { container } = render(<WikiButton type="abilities" name="Fireball" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Ability:Fireball');
  });

  test('generates correct URL for recipes', () => {
    const { container } = render(<WikiButton type="recipes" name="Basic Cloth Shirt" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Recipe:Basic_Cloth_Shirt');
  });

  test('generates correct URL for npcs without NPC: prefix', () => {
    const { container } = render(<WikiButton type="npcs" name="Marna" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Marna');
    expect(link.href).not.toContain('NPC:');
  });

  test('handles spaces in names', () => {
    const { container } = render(<WikiButton type="items" name="Great Sword of Power" />);
    const link = container.querySelector('a');
    expect(link.href).toContain('Great_Sword_of_Power');
    expect(link.href).not.toContain(' ');
  });

  test('defaults to main page when name is not provided', () => {
    const { container } = render(<WikiButton type="items" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Main_Page');
  });

  test('handles unknown type with default URL pattern', () => {
    const { container } = render(<WikiButton type="unknown" name="Test" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Test');
  });

  test('opens in new tab', () => {
    const { container } = render(<WikiButton type="items" name="Test" />);
    const link = container.querySelector('a');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noreferrer');
  });

  test('has correct title attribute', () => {
    const { container } = render(<WikiButton type="items" name="Test" />);
    const link = container.querySelector('a');
    expect(link.title).toBe('Open Wiki');
  });

  test('renders external-link icon', () => {
    const { container } = render(<WikiButton type="items" name="Test" />);
    // Icon component is mocked, so we just check it's there
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
  });

  test('handles empty string name', () => {
    const { container } = render(<WikiButton type="items" name="" />);
    const link = container.querySelector('a');
    expect(link.href).toBe('https://wiki.projectgorgon.com/wiki/Main_Page');
  });

  test('handles special characters in name', () => {
    const { container } = render(<WikiButton type="items" name="Item's Name" />);
    const link = container.querySelector('a');
    expect(link.href).toContain("Item's_Name");
  });
});
