import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorFallback from '../../src/components/ErrorFallback';

describe('ErrorFallback', () => {
  const mockError = new Error('Test error message');
  const mockErrorInfo = {
    componentStack: 'at Component\nat Parent'
  };
  const mockOnReset = () => {};

  test('renders error title', () => {
    render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
  });

  test('renders error icon', () => {
    const { container } = render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        onReset={mockOnReset}
      />
    );

    const icon = container.querySelector('[data-icon="AlertTriangle"]');
    expect(icon).toBeTruthy();
  });

  test('renders try again button with default label', () => {
    render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/Try Again/i)).toBeTruthy();
  });

  test('renders custom reset label when provided', () => {
    render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        onReset={mockOnReset}
        resetLabel="Restart App"
      />
    );

    expect(screen.getByText('Restart App')).toBeTruthy();
  });

  test('renders go home button', () => {
    render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('Go Home')).toBeTruthy();
  });

  test('renders report issue link', () => {
    const { container } = render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        onReset={mockOnReset}
      />
    );

    const link = container.querySelector('a[href*="github"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Report this issue');
  });

  test('handles missing error gracefully', () => {
    render(
      <ErrorFallback
        error={null}
        errorInfo={null}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
  });
});
