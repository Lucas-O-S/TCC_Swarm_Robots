import z from "zod";


export const robotPositionEventSchema = z.object({
  source: z.number(), x: z.number(), y: z.number(), direction: z.number().nullable(),
});

export const robotUpdateEventSchema = z.object({
  address: z.string(),
  position: robotPositionEventSchema.nullable(),
  battery: z.number().nullable(),
  waypointIdx: z.number().nullable(),
  updatedAt: z.string()
})


export type RobotSocketDto = z.infer<typeof robotUpdateEventSchema>;