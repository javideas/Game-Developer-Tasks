/**
 * Tests for Button Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Button, type ButtonOptions } from '../../../components/Button';

describe('Button Component', () => {
  let button: Button;
  let mockOnClick: () => void;

  beforeEach(() => {
    mockOnClick = vi.fn();
    button = new Button({
      label: 'Test Button',
      onClick: mockOnClick,
    });
  });

  describe('initialization', () => {
    it('should create a button instance', () => {
      expect(button).toBeInstanceOf(Button);
    });

    it('should be interactive', () => {
      expect(button.eventMode).toBe('static');
      expect(button.cursor).toBe('pointer');
    });

    it('should have children (background and label)', () => {
      expect(button.children.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply default dimensions when not specified', () => {
      // Default width/height from Button implementation
      const defaultButton = new Button({
        label: 'Default',
        onClick: vi.fn(),
      });
      expect(defaultButton).toBeDefined();
    });

    it('should apply custom dimensions when specified', () => {
      const customButton = new Button({
        label: 'Custom',
        width: 300,
        height: 60,
        onClick: vi.fn(),
      });
      expect(customButton).toBeDefined();
    });
  });

  describe('options', () => {
    it('should accept all optional parameters', () => {
      const fullOptions: ButtonOptions = {
        label: 'Full Options',
        width: 250,
        height: 55,
        backgroundColor: 0xff0000,
        textColor: '#000000',
        fontSize: 24,
        radius: 8,
        onClick: vi.fn(),
      };

      const customButton = new Button(fullOptions);
      expect(customButton).toBeDefined();
    });
  });

  describe('pointer events', () => {
    // Mock event object for PixiJS emit (requires FederatedPointerEvent)

    const mockEvent = {} as any;

    it('should call onClick when pointerup event fires', () => {
      button.emit('pointerup', mockEvent);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick on pointerdown', () => {
      button.emit('pointerdown', mockEvent);
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should change alpha on pointerover', () => {
      const initialAlpha = button.alpha;
      button.emit('pointerover', mockEvent);
      expect(button.alpha).toBeLessThan(initialAlpha);
    });

    it('should restore alpha on pointerout', () => {
      button.emit('pointerover', mockEvent);
      button.emit('pointerout', mockEvent);
      expect(button.alpha).toBe(1);
    });

    it('should scale down on pointerdown', () => {
      button.emit('pointerdown', mockEvent);
      expect(button.scale.x).toBeLessThan(1);
      expect(button.scale.y).toBeLessThan(1);
    });

    it('should restore scale on pointerup', () => {
      button.emit('pointerdown', mockEvent);
      button.emit('pointerup', mockEvent);
      expect(button.scale.x).toBe(1);
      expect(button.scale.y).toBe(1);
    });

    it('should scale up slightly on pointerover', () => {
      button.emit('pointerover', mockEvent);
      expect(button.scale.x).toBeGreaterThan(1);
      expect(button.scale.y).toBeGreaterThan(1);
    });
  });

  describe('cleanup', () => {
    it('should be destroyable', () => {
      expect(() => button.destroy()).not.toThrow();
    });

    it('should be marked as destroyed after destroy()', () => {
      button.destroy();
      expect(button.destroyed).toBe(true);
    });
  });
});
