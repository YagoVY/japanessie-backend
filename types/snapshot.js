const { z } = require('zod');

const LayoutSnapshotV2Schema = z.object({
  version: z.literal(2),
  printArea: z.object({
    widthIn: z.number().positive(),
    heightIn: z.number().positive(),
    dpi: z.number().positive()
  }),
  origin: z.literal('top-left'),
  canvasPx: z.object({ w: z.number().positive(), h: z.number().positive() }),
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
    align: z.object({ h: z.literal('center'), v: z.literal('baseline') }),
    textBlocks: z.array(z.object({
      text: z.string(),
      xIn: z.number(),
      yIn: z.number(),
      anchor: z.literal('center-baseline')
    }))
  })),
  meta: z.object({
    baseFontSizeRequested: z.number().positive(),
    orientation: z.enum(['horizontal', 'vertical']),
    printBoxPx: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
    canvasPx: z.object({ w: z.number().positive(), h: z.number().positive() }).optional()
  })
});

function parseSnapshotV2(data) {
  return LayoutSnapshotV2Schema.parse(data);
}

function isLayoutSnapshotV2(data) {
  return LayoutSnapshotV2Schema.safeParse(data).success;
}

module.exports = { parseSnapshotV2, isLayoutSnapshotV2, LayoutSnapshotV2Schema };
