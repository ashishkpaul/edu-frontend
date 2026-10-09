'use server';

import { mutate, query } from '@/lib/vendure/api';
import { getAuthToken } from '@/lib/auth';
import { GetBbbRoomStatusQuery, GetMyBbbRoomsQuery } from '@/lib/vendure/queries';
import { BbbJoinRoomMutation } from '@/lib/vendure/mutations';
import type { ClassAction, RoomCard } from './rooms-types';

/**
 * Server action: the rooms this customer can see, each carrying its
 * server-driven `classAction`.
 *
 * The list itself (`myBbbRooms`) does not evaluate per-room access, so the
 * action comes from `bbbRoomStatus` — the same shared evaluation `joinRoom`
 * uses (INV-027), which is why a preview failure must never blank the list.
 */
export async function getRoomsAction(): Promise<{ rooms: RoomCard[] | null }> {
    const token = await getAuthToken();
    if (!token) {
        return { rooms: [] };
    }

    try {
        const { data } = await query(GetMyBbbRoomsQuery, undefined, {
            useAuthToken: true,
        });
        const rooms = (data.myBbbRooms ?? []) as Array<{
            id: string;
            name: string;
            state: string;
        }>;

        const withAction = await Promise.all(
            rooms.map(async (room): Promise<RoomCard> => {
                try {
                    const { data: statusData } = await query(
                        GetBbbRoomStatusQuery,
                        { id: room.id },
                        { useAuthToken: true },
                    );
                    const status = statusData.bbbRoomStatus;
                    return {
                        id: room.id,
                        name: room.name,
                        state: status?.state ?? room.state,
                        classAction: (status?.classAction ?? null) as ClassAction | null,
                    };
                } catch {
                    // A single room's preview failing (e.g. access just
                    // revoked) must not hide the rooms that DID resolve.
                    return {
                        id: room.id,
                        name: room.name,
                        state: room.state,
                        classAction: null,
                    };
                }
            }),
        );
        return { rooms: withAction };
    } catch {
        // Non-fatal — the page renders its own error state from `null`.
        return { rooms: null };
    }
}

/**
 * Server action: run the room's join/start action.
 *
 * The BACKEND decides the outcome — a trainer gets a join URL (or a
 * provisioning status while the room starts), a learner on an unstarted room
 * gets `waiting_for_trainer`. This action relays that contract verbatim.
 */
export async function joinRoomAction(
    roomId: string,
    participantName: string,
): Promise<{ status: string; joinUrl: string | null }> {
    const token = await getAuthToken();
    if (!token) {
        return { status: 'failed', joinUrl: null };
    }

    try {
        const { data } = await mutate(
            BbbJoinRoomMutation,
            { roomId, participantName },
            { useAuthToken: true },
        );
        return {
            status: data.bbbJoinRoom.status,
            joinUrl: data.bbbJoinRoom.joinUrl ?? null,
        };
    } catch {
        return { status: 'failed', joinUrl: null };
    }
}
