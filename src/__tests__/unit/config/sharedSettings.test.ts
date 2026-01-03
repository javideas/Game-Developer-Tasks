/**
 * Tests for Shared Settings Configuration
 */
import { describe, it, expect } from 'vitest';

import { SCENE_LAYOUT, type ScreenPadding } from '../../../config/sharedSettings';

describe('SCENE_LAYOUT', () => {
  describe('breakpoints', () => {
    it('should have a positive phone breakpoint', () => {
      expect(SCENE_LAYOUT.phoneBreakpoint).toBeGreaterThan(0);
    });

    it('should have phone breakpoint less than large padding breakpoint', () => {
      expect(SCENE_LAYOUT.phoneBreakpoint).toBeLessThan(SCENE_LAYOUT.largePaddingBreakpoint);
    });

    it('should have reasonable breakpoint values for responsive design', () => {
      // Phone breakpoint should be around 400-600px for typical phones
      expect(SCENE_LAYOUT.phoneBreakpoint).toBeGreaterThanOrEqual(300);
      expect(SCENE_LAYOUT.phoneBreakpoint).toBeLessThanOrEqual(700);

      // Large padding breakpoint should be around 700-1000px for tablets
      expect(SCENE_LAYOUT.largePaddingBreakpoint).toBeGreaterThanOrEqual(600);
      expect(SCENE_LAYOUT.largePaddingBreakpoint).toBeLessThanOrEqual(1200);
    });
  });

  describe('screen padding', () => {
    const validatePadding = (padding: ScreenPadding, name: string) => {
      it(`${name} should have all positive values`, () => {
        expect(padding.left).toBeGreaterThanOrEqual(0);
        expect(padding.right).toBeGreaterThanOrEqual(0);
        expect(padding.top).toBeGreaterThanOrEqual(0);
        expect(padding.bottom).toBeGreaterThanOrEqual(0);
      });

      it(`${name} should have symmetric horizontal padding`, () => {
        expect(padding.left).toBe(padding.right);
      });
    };

    validatePadding(SCENE_LAYOUT.screenPaddingPhone, 'screenPaddingPhone');
    validatePadding(SCENE_LAYOUT.screenPadding, 'screenPadding');

    it('should have phone padding smaller than desktop padding', () => {
      expect(SCENE_LAYOUT.screenPaddingPhone.left).toBeLessThan(SCENE_LAYOUT.screenPadding.left);
      expect(SCENE_LAYOUT.screenPaddingPhone.right).toBeLessThan(SCENE_LAYOUT.screenPadding.right);
    });
  });

  describe('maxScale', () => {
    it('should be greater than 1 to allow scaling up', () => {
      expect(SCENE_LAYOUT.maxScale).toBeGreaterThan(1);
    });

    it('should be less than 5 to prevent extreme scaling', () => {
      expect(SCENE_LAYOUT.maxScale).toBeLessThan(5);
    });

    it('should be in a reasonable range for UI scaling', () => {
      // 1.5-3.0 is typical for responsive game UI
      expect(SCENE_LAYOUT.maxScale).toBeGreaterThanOrEqual(1.5);
      expect(SCENE_LAYOUT.maxScale).toBeLessThanOrEqual(3.0);
    });
  });
});
