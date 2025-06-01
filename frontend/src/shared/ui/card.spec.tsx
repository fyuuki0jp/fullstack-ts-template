import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <h1>Test Title</h1>
        <p>Test content</p>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies default styling', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;

    expect(card.className).toMatch(/bg-white/);
    expect(card.className).toMatch(/rounded-lg/);
    expect(card.className).toMatch(/shadow-md/);
    expect(card.className).toMatch(/p-6/);
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const card = container.firstChild as HTMLElement;

    expect(card.className).toMatch(/custom-class/);
    expect(card.className).toMatch(/bg-white/); // Should still have base classes
  });

  it('handles empty children', () => {
    render(<Card></Card>);
    const card = document.querySelector('.bg-white');

    expect(card).toBeInTheDocument();
    expect(card).toBeEmptyDOMElement();
  });
});
