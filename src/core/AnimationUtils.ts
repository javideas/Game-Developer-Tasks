/**
 * Animation and asset utility functions
 */
import gsap from 'gsap';
import { Container, type ISpritesheetData } from 'pixi.js';

/**
 * Recursively kill all GSAP tweens on a container and all its descendants.
 * Also kills tweens on scale and position properties which GSAP often targets separately.
 *
 * Call this BEFORE destroying any containers to prevent "transform is null" errors.
 *
 * @param target - The container to recursively clean up
 */
export function killTweensRecursive(target: Container): void {
  // Kill tweens on the container itself and common animated properties
  gsap.killTweensOf(target);
  gsap.killTweensOf(target.scale);
  gsap.killTweensOf(target.position);

  // Recursively process all children
  for (const child of target.children) {
    if (child instanceof Container) {
      killTweensRecursive(child);
    } else {
      // For non-container display objects (Sprites, Text, Graphics, etc.)
      gsap.killTweensOf(child);
      if ('scale' in child) gsap.killTweensOf(child.scale);
      if ('position' in child) gsap.killTweensOf(child.position);
    }
  }
}

/**
 * Prefix all frame names in a spritesheet JSON to avoid global texture cache collisions.
 *
 * Use this when multiple spritesheets have the same frame naming pattern (e.g., sprite-1-1.png).
 * PixiJS adds all parsed frame textures to a global cache, so identical names cause warnings.
 *
 * @param data - Original spritesheet JSON data
 * @param prefix - Unique prefix for this spritesheet (e.g., 'flame-', 'card-')
 * @returns New spritesheet data with prefixed frame names
 */
export function prefixSpritesheetFrames(data: ISpritesheetData, prefix: string): ISpritesheetData {
  const newFrames: Record<string, (typeof data.frames)[string]> = {};

  // Prefix all frame names
  for (const [key, value] of Object.entries(data.frames)) {
    newFrames[prefix + key] = value;
  }

  // Prefix animation references too
  let newAnimations: Record<string, string[]> | undefined;
  if (data.animations) {
    newAnimations = {};
    for (const [animName, frames] of Object.entries(data.animations)) {
      newAnimations[animName] = frames.map(frame => prefix + frame);
    }
  }

  return {
    ...data,
    frames: newFrames,
    animations: newAnimations,
  };
}
