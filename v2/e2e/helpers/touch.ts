/**
 * Touch gesture helpers for Playwright mobile testing.
 *
 * These use dispatchEvent with TouchEvent sequences to simulate
 * real touch interactions (swipe, drag, tap-and-hold) on mobile viewports.
 *
 * Usage: import in any .spec.ts and use with a Locator.
 *
 * Note: dispatchEvent creates untrusted events (isTrusted=false).
 * If your gesture handler checks isTrusted, these won't work.
 * Silk and our custom useSheetDrag do NOT check isTrusted.
 */

import type { Locator, Page } from '@playwright/test';

interface Point {
  x: number;
  y: number;
}

/**
 * Get the center point of an element.
 */
async function getCenter(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element not visible — cannot get bounding box');
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Create a touch point object for dispatchEvent.
 */
function touchPoint(id: number, x: number, y: number) {
  return { identifier: id, clientX: x, clientY: y, pageX: x, pageY: y };
}

/**
 * Simulate a swipe gesture on an element.
 *
 * @param locator - The element to swipe on
 * @param direction - 'up' | 'down' | 'left' | 'right'
 * @param distance - Pixels to swipe (default 300)
 * @param steps - Number of intermediate touchmove events (default 10)
 * @param durationMs - Approximate total duration in ms (default 250)
 */
export async function swipe(
  locator: Locator,
  direction: 'up' | 'down' | 'left' | 'right',
  distance = 300,
  steps = 10,
  durationMs = 250,
) {
  const center = await getCenter(locator);
  const stepDelay = durationMs / steps;

  // Calculate movement deltas per step
  const dx = direction === 'left' ? -distance / steps : direction === 'right' ? distance / steps : 0;
  const dy = direction === 'up' ? -distance / steps : direction === 'down' ? distance / steps : 0;

  // touchstart
  const startTouch = [touchPoint(0, center.x, center.y)];
  await locator.dispatchEvent('pointerdown', { clientX: center.x, clientY: center.y, pointerId: 1, pointerType: 'touch' });
  await locator.dispatchEvent('touchstart', {
    touches: startTouch,
    changedTouches: startTouch,
    targetTouches: startTouch,
  });

  // touchmove — stepped for realistic velocity detection
  for (let i = 1; i <= steps; i++) {
    const currentX = center.x + dx * i;
    const currentY = center.y + dy * i;
    const moveTouch = [touchPoint(0, currentX, currentY)];

    await locator.dispatchEvent('pointermove', { clientX: currentX, clientY: currentY, pointerId: 1, pointerType: 'touch' });
    await locator.dispatchEvent('touchmove', {
      touches: moveTouch,
      changedTouches: moveTouch,
      targetTouches: moveTouch,
    });

    // Small delay between steps for velocity calculation
    if (stepDelay > 0) {
      await locator.page().waitForTimeout(stepDelay);
    }
  }

  // touchend
  const endX = center.x + dx * steps;
  const endY = center.y + dy * steps;
  const endTouch = [touchPoint(0, endX, endY)];

  await locator.dispatchEvent('pointerup', { clientX: endX, clientY: endY, pointerId: 1, pointerType: 'touch' });
  await locator.dispatchEvent('touchend', {
    touches: [],
    changedTouches: endTouch,
    targetTouches: [],
  });
}

/**
 * Swipe up on an element (e.g., drag bottom sheet up).
 */
export async function swipeUp(locator: Locator, distance = 300) {
  return swipe(locator, 'up', distance);
}

/**
 * Swipe down on an element (e.g., drag bottom sheet down).
 */
export async function swipeDown(locator: Locator, distance = 300) {
  return swipe(locator, 'down', distance);
}

/**
 * Swipe from one point to another (coordinate-based).
 * Useful when you need precise start/end positions.
 */
export async function swipeFromTo(
  page: Page,
  from: Point,
  to: Point,
  steps = 10,
  durationMs = 250,
) {
  const stepDelay = durationMs / steps;
  const dx = (to.x - from.x) / steps;
  const dy = (to.y - from.y) / steps;

  // touchstart at from
  await page.dispatchEvent('body', 'touchstart', {
    touches: [touchPoint(0, from.x, from.y)],
    changedTouches: [touchPoint(0, from.x, from.y)],
    targetTouches: [touchPoint(0, from.x, from.y)],
  });

  // touchmove steps
  for (let i = 1; i <= steps; i++) {
    const x = from.x + dx * i;
    const y = from.y + dy * i;
    await page.dispatchEvent('body', 'touchmove', {
      touches: [touchPoint(0, x, y)],
      changedTouches: [touchPoint(0, x, y)],
      targetTouches: [touchPoint(0, x, y)],
    });
    if (stepDelay > 0) await page.waitForTimeout(stepDelay);
  }

  // touchend at to
  await page.dispatchEvent('body', 'touchend', {
    touches: [],
    changedTouches: [touchPoint(0, to.x, to.y)],
    targetTouches: [],
  });
}

/**
 * Tap and hold an element (long press).
 */
export async function longPress(locator: Locator, holdMs = 500) {
  const center = await getCenter(locator);
  const touch = [touchPoint(0, center.x, center.y)];

  await locator.dispatchEvent('touchstart', {
    touches: touch,
    changedTouches: touch,
    targetTouches: touch,
  });

  await locator.page().waitForTimeout(holdMs);

  await locator.dispatchEvent('touchend', {
    touches: [],
    changedTouches: touch,
    targetTouches: [],
  });
}

/**
 * Quick fling gesture (fast swipe with high velocity).
 * Uses fewer steps and shorter duration than regular swipe.
 */
export async function fling(
  locator: Locator,
  direction: 'up' | 'down' | 'left' | 'right',
  distance = 400,
) {
  return swipe(locator, direction, distance, 5, 80);
}
