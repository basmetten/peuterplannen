import { createMachine, assign } from 'xstate';

/**
 * Sheet snap points as percentage of viewport height.
 * These match Apple Maps behavior.
 */
export const SNAP_POINTS = {
  hidden: 0,
  peek: 25,
  half: 50,
  full: 92,
} as const;

export type SheetSnap = keyof typeof SNAP_POINTS;

interface SheetContext {
  /** Current snap state */
  snap: SheetSnap;
  /** Location ID shown in detail (null = browse mode) */
  detailId: number | null;
  /** Previous snap before detail opened (for back navigation) */
  previousSnap: SheetSnap;
  /** Location IDs in the carousel (null = no carousel) */
  carouselLocationIds: number[] | null;
  /** Currently highlighted location in the carousel */
  carouselActiveId: number | null;
}

type SheetEvent =
  | { type: 'SNAP_TO'; target: SheetSnap }
  | { type: 'OPEN_DETAIL'; id: number }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'DRAG_END'; snapTo: SheetSnap }
  | { type: 'CAROUSEL_OPEN'; locationIds: number[] }
  | { type: 'CAROUSEL_SWIPE'; locationId: number }
  | { type: 'CAROUSEL_CLOSE' };

export const sheetMachine = createMachine({
  id: 'sheet',
  types: {} as {
    context: SheetContext;
    events: SheetEvent;
  },
  context: {
    snap: 'peek',
    detailId: null,
    previousSnap: 'peek',
    carouselLocationIds: null,
    carouselActiveId: null,
  },
  initial: 'browse',
  states: {
    browse: {
      on: {
        SNAP_TO: {
          actions: assign({ snap: ({ event }) => event.target }),
        },
        DRAG_END: {
          actions: assign({ snap: ({ event }) => event.snapTo }),
        },
        OPEN_DETAIL: {
          target: 'detail',
          actions: assign({
            previousSnap: ({ context }) => context.snap,
            detailId: ({ event }) => event.id,
            snap: 'half' as SheetSnap,
          }),
        },
        CAROUSEL_OPEN: {
          target: 'carousel',
          actions: assign({
            previousSnap: ({ context }) => context.snap,
            carouselLocationIds: ({ event }) => event.locationIds,
            carouselActiveId: ({ event }) => event.locationIds[0] ?? null,
            snap: 'hidden' as SheetSnap,
          }),
        },
      },
    },
    detail: {
      on: {
        SNAP_TO: {
          actions: assign({ snap: ({ event }) => event.target }),
        },
        DRAG_END: [
          {
            guard: ({ event }) => event.snapTo === 'hidden' || event.snapTo === 'peek',
            target: 'browse',
            actions: assign({
              detailId: null,
              snap: ({ context }) => context.previousSnap,
            }),
          },
          {
            actions: assign({ snap: ({ event }) => event.snapTo }),
          },
        ],
        CLOSE_DETAIL: {
          target: 'browse',
          actions: assign({
            detailId: null,
            snap: ({ context }) => context.previousSnap,
          }),
        },
      },
    },
    carousel: {
      on: {
        CAROUSEL_SWIPE: {
          actions: assign({
            carouselActiveId: ({ event }) => event.locationId,
          }),
        },
        CAROUSEL_CLOSE: {
          target: 'browse',
          actions: assign({
            carouselLocationIds: null,
            carouselActiveId: null,
            snap: ({ context }) => context.previousSnap,
          }),
        },
        OPEN_DETAIL: {
          target: 'detail',
          actions: assign({
            carouselLocationIds: null,
            carouselActiveId: null,
            detailId: ({ event }) => event.id,
            snap: 'half' as SheetSnap,
          }),
        },
      },
    },
  },
});
