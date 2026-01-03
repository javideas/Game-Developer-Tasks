/**
 * Tests for Ace of Shadows Settings Configuration
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  CARD_CONFIG,
  TIMING_DEFAULTS,
  TIMING_SLIDER,
  BLUR_SLIDER,
  ARC_DEFAULTS,
  ARC_SLIDER,
  SHADOW_CONFIG,
  TOGGLE_DEFAULTS,
  POKER_SUIT_ROWS,
  CARD_BACKS,
  PANEL_UI,
  TRIPEAKS_CONFIG,
  TABLEAU_LAYOUTS,
  getDefaultSettings,
  getPreservedSettings,
  saveSettings,
  clearPreservedSettings,
  type AceOfShadowsState,
} from '../../../config/aceOfShadowsSettings';

describe('Card Configuration', () => {
  it('should have valid stack offset', () => {
    expect(CARD_CONFIG.stackOffset).toBeGreaterThanOrEqual(0);
    expect(CARD_CONFIG.stackOffset).toBeLessThanOrEqual(10);
  });

  it('should have reasonable total cards count', () => {
    expect(CARD_CONFIG.totalCards).toBeGreaterThan(0);
    expect(CARD_CONFIG.totalCards).toBeLessThanOrEqual(520); // Max 10 decks
  });

  it('should have valid card scale', () => {
    expect(CARD_CONFIG.scale).toBeGreaterThan(0);
    expect(CARD_CONFIG.scale).toBeLessThanOrEqual(2);
  });
});

describe('Timing Configuration', () => {
  it('should have valid default timing values', () => {
    expect(TIMING_DEFAULTS.interval).toBeGreaterThan(0);
    expect(TIMING_DEFAULTS.duration).toBeGreaterThan(0);
    expect(TIMING_DEFAULTS.motionBlur).toBeGreaterThanOrEqual(0);
  });

  it('should have timing slider with min less than max', () => {
    expect(TIMING_SLIDER.min).toBeLessThan(TIMING_SLIDER.max);
    expect(TIMING_SLIDER.step).toBeGreaterThan(0);
  });

  it('should have blur slider with valid range', () => {
    expect(BLUR_SLIDER.min).toBeLessThanOrEqual(BLUR_SLIDER.max);
    expect(BLUR_SLIDER.min).toBeGreaterThanOrEqual(0);
  });

  it('should have default timing within slider range', () => {
    expect(TIMING_DEFAULTS.interval).toBeGreaterThanOrEqual(TIMING_SLIDER.min);
    expect(TIMING_DEFAULTS.interval).toBeLessThanOrEqual(TIMING_SLIDER.max);
    expect(TIMING_DEFAULTS.duration).toBeGreaterThanOrEqual(TIMING_SLIDER.min);
    expect(TIMING_DEFAULTS.duration).toBeLessThanOrEqual(TIMING_SLIDER.max);
  });
});

describe('Arc Configuration', () => {
  it('should have positive arc heights', () => {
    expect(ARC_DEFAULTS.heightA).toBeGreaterThan(0);
    expect(ARC_DEFAULTS.heightB).toBeGreaterThan(0);
  });

  it('should have arc slider with valid range', () => {
    expect(ARC_SLIDER.min).toBeLessThan(ARC_SLIDER.max);
    expect(ARC_SLIDER.step).toBeGreaterThan(0);
  });

  it('should have default arc heights within slider range', () => {
    expect(ARC_DEFAULTS.heightA).toBeGreaterThanOrEqual(ARC_SLIDER.min);
    expect(ARC_DEFAULTS.heightA).toBeLessThanOrEqual(ARC_SLIDER.max);
    expect(ARC_DEFAULTS.heightB).toBeGreaterThanOrEqual(ARC_SLIDER.min);
    expect(ARC_DEFAULTS.heightB).toBeLessThanOrEqual(ARC_SLIDER.max);
  });
});

describe('Shadow Configuration', () => {
  it('should have valid shadow offset', () => {
    expect(typeof SHADOW_CONFIG.offsetX).toBe('number');
    expect(typeof SHADOW_CONFIG.offsetY).toBe('number');
  });

  it('should have alpha between 0 and 1', () => {
    expect(SHADOW_CONFIG.alpha).toBeGreaterThanOrEqual(0);
    expect(SHADOW_CONFIG.alpha).toBeLessThanOrEqual(1);
  });
});

describe('Toggle Defaults', () => {
  it('should have boolean realisticShadows', () => {
    expect(typeof TOGGLE_DEFAULTS.realisticShadows).toBe('boolean');
  });

  it('should have valid animation mode', () => {
    expect(['linear', 'spiral']).toContain(TOGGLE_DEFAULTS.animationMode);
  });
});

describe('Poker Suit Rows', () => {
  it('should have 4 poker suits', () => {
    expect(POKER_SUIT_ROWS).toHaveLength(4);
  });

  it('should contain valid row indices', () => {
    POKER_SUIT_ROWS.forEach(row => {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(10); // Reasonable spritesheet size
    });
  });
});

describe('Card Backs', () => {
  it('should have red and dark variants', () => {
    expect(CARD_BACKS.red).toBeDefined();
    expect(CARD_BACKS.dark).toBeDefined();
  });

  it('should have valid texture names', () => {
    expect(CARD_BACKS.red).toMatch(/\.png$/);
    expect(CARD_BACKS.dark).toMatch(/\.png$/);
  });
});

describe('Panel UI Configuration', () => {
  it('should have positive padding values', () => {
    expect(PANEL_UI.paddingX).toBeGreaterThan(0);
    expect(PANEL_UI.paddingY).toBeGreaterThan(0);
  });

  it('should have positive gap value', () => {
    expect(PANEL_UI.gap).toBeGreaterThan(0);
  });

  it('should have cell widths arrays with correct lengths', () => {
    expect(PANEL_UI.row1CellWidths).toHaveLength(5);
    expect(PANEL_UI.row2CellWidths).toHaveLength(5);
  });
});

describe('TriPeaks Configuration', () => {
  it('should have valid card scale', () => {
    expect(TRIPEAKS_CONFIG.cardScale).toBeGreaterThan(0);
    expect(TRIPEAKS_CONFIG.cardScale).toBeLessThanOrEqual(1);
  });

  it('should have valid default layout', () => {
    expect(['castle', 'hexagon', 'crown']).toContain(TRIPEAKS_CONFIG.defaultLayout);
  });

  it('should have valid tableau position', () => {
    expect(TRIPEAKS_CONFIG.tableauCenterX).toBeGreaterThan(0);
    expect(TRIPEAKS_CONFIG.tableauTopY).toBeGreaterThan(0);
  });

  it('should have valid player area configuration', () => {
    expect(TRIPEAKS_CONFIG.stockX).toBeGreaterThan(0);
    expect(TRIPEAKS_CONFIG.wasteX).toBeGreaterThan(TRIPEAKS_CONFIG.stockX);
    expect(TRIPEAKS_CONFIG.playerAreaY).toBeGreaterThan(TRIPEAKS_CONFIG.tableauTopY);
  });
});

describe('Tableau Layouts', () => {
  const layoutNames: ('castle' | 'hexagon' | 'crown')[] = ['castle', 'hexagon', 'crown'];

  layoutNames.forEach(layoutName => {
    describe(`${layoutName} layout`, () => {
      const layout = TABLEAU_LAYOUTS[layoutName];

      it('should have a name', () => {
        expect(layout.name).toBeDefined();
        expect(layout.name.length).toBeGreaterThan(0);
      });

      it('should have valid row configuration', () => {
        expect(layout.rows).toBeGreaterThan(0);
        expect(layout.cardsPerRow).toHaveLength(layout.rows);
      });

      it('should have positive cards per row', () => {
        layout.cardsPerRow.forEach(count => {
          expect(count).toBeGreaterThan(0);
        });
      });

      it('should have valid overlap ratios', () => {
        expect(layout.verticalOverlap).toBeGreaterThan(0);
        expect(layout.horizontalOverlap).toBeGreaterThan(0);
      });

      it('should have defined initialFaceUpRows', () => {
        expect(layout.initialFaceUpRows).toBeGreaterThanOrEqual(0);
        expect(layout.initialFaceUpRows).toBeLessThanOrEqual(layout.rows);
      });
    });
  });
});

describe('Settings Persistence', () => {
  beforeEach(() => {
    clearPreservedSettings();
  });

  describe('getDefaultSettings', () => {
    it('should return valid default settings', () => {
      const defaults = getDefaultSettings();

      expect(defaults.interval).toBe(TIMING_DEFAULTS.interval);
      expect(defaults.duration).toBe(TIMING_DEFAULTS.duration);
      expect(defaults.motionBlur).toBe(TIMING_DEFAULTS.motionBlur);
      expect(defaults.arcHeightA).toBe(ARC_DEFAULTS.heightA);
      expect(defaults.arcHeightB).toBe(ARC_DEFAULTS.heightB);
      expect(defaults.realisticShadows).toBe(TOGGLE_DEFAULTS.realisticShadows);
      expect(defaults.animationMode).toBe(TOGGLE_DEFAULTS.animationMode);
      expect(defaults.keepSettings).toBe(TOGGLE_DEFAULTS.keepSettings);
      expect(defaults.activeDeck).toBe('left');
    });
  });

  describe('getPreservedSettings', () => {
    it('should return null when no settings are preserved', () => {
      expect(getPreservedSettings()).toBeNull();
    });
  });

  describe('saveSettings', () => {
    it('should preserve settings when keepSettings is true', () => {
      const settings: AceOfShadowsState = {
        ...getDefaultSettings(),
        interval: 0.5,
        keepSettings: true,
      };

      saveSettings(settings);

      const preserved = getPreservedSettings();
      expect(preserved).not.toBeNull();
      expect(preserved!.interval).toBe(0.5);
    });

    it('should not preserve settings when keepSettings is false', () => {
      const settings: AceOfShadowsState = {
        ...getDefaultSettings(),
        interval: 0.5,
        keepSettings: false,
      };

      saveSettings(settings);

      expect(getPreservedSettings()).toBeNull();
    });

    it('should create a copy of settings, not a reference', () => {
      const settings: AceOfShadowsState = {
        ...getDefaultSettings(),
        keepSettings: true,
      };

      saveSettings(settings);
      settings.interval = 999;

      const preserved = getPreservedSettings();
      expect(preserved!.interval).not.toBe(999);
    });
  });

  describe('clearPreservedSettings', () => {
    it('should clear previously preserved settings', () => {
      const settings: AceOfShadowsState = {
        ...getDefaultSettings(),
        keepSettings: true,
      };

      saveSettings(settings);
      expect(getPreservedSettings()).not.toBeNull();

      clearPreservedSettings();
      expect(getPreservedSettings()).toBeNull();
    });
  });
});
