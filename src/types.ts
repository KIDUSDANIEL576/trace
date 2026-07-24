export type Brush = 'marker' | 'glow' | 'neon' | 'chalk' | 'invisible';

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
  createdAt?: number; // epoch ms — drives Presence Painting's ink bloom
}

// Realtime broadcast payloads (channel `couple:{couple_id}`)
export interface StrokeStartPayload {
  strokeId: string;
  canvasId: string;
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
export interface CanvasClearPayload {
  canvasId: string;
}
export interface CanvasNewPayload {
  canvasId: string;
}

export interface PresenceState {
  userId: string;
  name: string;
  drawing: boolean;
}

export interface CanvasInfo {
  id: string;
  kind: 'shared' | 'photo';
  photoPath: string | null; // storage path within the photos bucket
  createdAt: string;
}

// Phase 5 · Time Capsules — a drawing sealed until a date.
export interface CapsuleMeta {
  id: string;
  authorId: string;
  note: string | null;
  opensAt: string; // timestamptz ISO
  openedAt: string | null;
  createdAt: string;
}
export interface CapsuleStroke {
  brush: Brush;
  color: string;
  width: number;
  points: Point[];
}

export interface Membership {
  coupleId: string;
  inviteCode: string;
  displayName: string;
  canvasId: string; // the couple's shared canvas
  canvases: CanvasInfo[]; // shared + photo canvases, oldest first
  partnerName: string | null;
  premium: boolean; // Trace Forever — one purchase unlocks both partners
  coupleSince: string | null; // couples.created_at — "drawing together since…"
}
