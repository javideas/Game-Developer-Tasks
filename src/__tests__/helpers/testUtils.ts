/**
 * Shared test utilities and mock factories
 */
import { vi } from 'vitest';

/**
 * Create a mock PixiJS Container
 */
export function createMockContainer() {
  return {
    addChild: vi.fn().mockReturnThis(),
    removeChild: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    children: [] as unknown[],
    visible: true,
    alpha: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    scale: { x: 1, y: 1, set: vi.fn() },
    pivot: { x: 0, y: 0, set: vi.fn() },
    position: { x: 0, y: 0, set: vi.fn() },
    anchor: { x: 0, y: 0, set: vi.fn() },
    eventMode: 'static',
    cursor: 'default',
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    destroyed: false,
    parent: null,
    transform: {},
    filters: [],
  };
}

/**
 * Create a mock PixiJS Sprite
 */
export function createMockSprite() {
  return {
    ...createMockContainer(),
    texture: { width: 100, height: 100 },
    tint: 0xffffff,
  };
}

/**
 * Create a mock PixiJS Graphics
 */
export function createMockGraphics() {
  return {
    ...createMockContainer(),
    beginFill: vi.fn().mockReturnThis(),
    endFill: vi.fn().mockReturnThis(),
    drawRect: vi.fn().mockReturnThis(),
    drawRoundedRect: vi.fn().mockReturnThis(),
    drawCircle: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
  };
}

/**
 * Create a mock PixiJS Text
 */
export function createMockText() {
  return {
    ...createMockContainer(),
    text: '',
    style: {},
  };
}

/**
 * Create a mock Spritesheet
 */
export function createMockSpritesheet() {
  return {
    textures: {},
    animations: {},
    parse: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    baseTexture: {
      destroy: vi.fn(),
    },
  };
}

/**
 * Create a mock GSAP timeline
 */
export function createMockTimeline() {
  const timeline = {
    to: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    pause: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis(),
    kill: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    progress: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnValue(1),
    isActive: vi.fn().mockReturnValue(false),
  };
  return timeline;
}

/**
 * Wait for next tick (useful for async operations)
 */
export function nextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  await nextTick();
  await nextTick();
}
