/**
 * Animation utility functions for safe GSAP cleanup
 */
import gsap from 'gsap';
import { Container } from 'pixi.js';

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

