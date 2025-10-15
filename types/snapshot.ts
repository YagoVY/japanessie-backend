import { z } from 'zod';

// LayoutSnapshotV2 type definition - authoritative schema from FE
export type LayoutSnapshotV2 = {
  version: 2;
  printArea: { 
    widthIn: number; 
    heightIn: number; 
    dpi: number; 
  }; // 12 x 16, 300
  origin: 'top-left';
  canvasPx: { 
    w: number; 
    h: number; 
  }; // 600 x 600 (FE preview basis)
  layers: Array<{
    type: 'text';
    font: {
      family: string;                // e.g., "Yuji Syuku"
      sizePt: number;                // FE computed (px * 0.75)
      lineHeight: number;            // 1.10
      letterSpacingEm: number;       // 0.12 for horizontal, 0 for vertical
      vertical: boolean;             // true for vertical flow
      textOrientation: 'upright';    // fixed
      hyphenPolicy: 'jp-long-vbar';  // FE's choice
    };
    color: string;                    // hex, e.g. "#FFFFFF"
    align: { 
      h: 'center'; 
      v: 'baseline' 
    };
    textBlocks: Array<{
      text: string;                   // glyph or line
      xIn: number;                    // inches from top-left of print area
      yIn: number;                    // inches from top-left of print area
      anchor: 'center-baseline';      // FE anchor; we must respect this
    }>;
  }>;
  meta: { 
    baseFontSizeRequested: number; 
    orientation: 'horizontal' | 'vertical' 
  };
};

// Zod validator for LayoutSnapshotV2
export const LayoutSnapshotV2Schema = z.object({
  version: z.literal(2),
  printArea: z.object({
    widthIn: z.number().positive(),
    heightIn: z.number().positive(),
    dpi: z.number().positive()
  }),
  origin: z.literal('top-left'),
  canvasPx: z.object({
    w: z.number().positive(),
    h: z.number().positive()
  }),
  layers: z.array(z.object({
    type: z.literal('text'),
    font: z.object({
      family: z.string().min(1),
      sizePt: z.number().positive(),
      lineHeight: z.number().positive(),
      letterSpacingEm: z.number(),
      vertical: z.boolean(),
      textOrientation: z.literal('upright'),
      hyphenPolicy: z.literal('jp-long-vbar')
    }),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
    align: z.object({
      h: z.literal('center'),
      v: z.literal('baseline')
    }),
    textBlocks: z.array(z.object({
      text: z.string(),
      xIn: z.number(),
      yIn: z.number(),
      anchor: z.literal('center-baseline')
    }))
  })),
  meta: z.object({
    baseFontSizeRequested: z.number().positive(),
    orientation: z.enum(['horizontal', 'vertical'])
  })
});

// Validation function
export function parseSnapshotV2(data: unknown): LayoutSnapshotV2 {
  return LayoutSnapshotV2Schema.parse(data);
}

// Type guard
export function isLayoutSnapshotV2(data: unknown): data is LayoutSnapshotV2 {
  return LayoutSnapshotV2Schema.safeParse(data).success;
}
