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
}

type SheetEvent =
  | { type: 'SNAP_TO'; target: SheetSnap }
  | { type: 'OPEN_DETAIL'; id: number }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'DRAG_END'; snapTo: SheetSnap };

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
  },
});
