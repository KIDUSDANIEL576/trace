export type Brush = 'marker' | 'glow' | 'neon' | 'chalk';

// Points are normalized 0..1 so canvases render identically across screen sizes.
export type Point = [number, number];

export interface Stroke {
  id: string; // client-generated uuid; rehydrated strokes use `db-{rowId}`
  dbId?: number; // strokes table row id once persisted
  authorId: string;
  brush: Brush;
  color: string;
  width: number; // normalized to canvas width (px / canvasWidth)
  points: Point[];
}

// Realtime broadcast payloads (channel `couple:{couple_id}`)
export interface StrokeStartPayload {
  strokeId: string;
  authorId: string;
  brush: Brush;
  color: string;
  width: number;
}
export interface StrokePointsPayload {
  strokeId: string;
  pts: Point[];
}
export interface StrokeEndPayload {
  strokeId: string;
  dbId: number | null;
}
export interface StrokeUndoPayload {
  strokeId: string;
  dbId: number | null;
}

export interface PresenceState {
  userId: string;
  name: string;
  drawing: boolean;
}

export interface Membership {
  coupleId: string;
  inviteCode: string;
  displayName: string;
  canvasId: string;
  partnerName: string | null;
}
