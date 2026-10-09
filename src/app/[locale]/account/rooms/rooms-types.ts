/**
 * Shared types for the Classrooms screen.
 *
 * Kept out of `actions.ts` because that file is a `'use server'` module (only
 * async function exports are permitted there).
 */

/**
 * Server-driven room action (INV-008) — the backend derives it from the same
 * access evaluation as `joinRoom` plus the room state; the client only renders.
 *
 *   START  trainer may start an idle/provisioning room
 *   JOIN   the room is live — anyone with access joins
 *   WAIT   authorized, but not a moderator and nobody has started it
 *   NONE   no safe action (Failed room, or no access)
 */
export type ClassAction = 'START' | 'JOIN' | 'WAIT' | 'NONE';

export interface RoomCard {
    id: string;
    name: string;
    state: string;
    classAction: ClassAction | null;
}
