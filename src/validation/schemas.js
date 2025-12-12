import { z } from 'zod';

// Item schema (example, expand as needed)
export const ItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  type: z.string(),
  data: z.object({
    IconId: z.union([z.string(), z.number()]).optional(),
    IconID: z.union([z.string(), z.number()]).optional(),
    Level: z.number().optional(),
    SkillLevelReq: z.number().optional(),
    // ...add more fields as needed
  }),
  refs: z.array(z.string()).optional(),
});

// Character schema (example, expand as needed)
export const CharacterSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  level: z.number(),
  // ...add more fields as needed
});

// VendorLog schema (example, expand as needed)
export const VendorLogSchema = z.object({
  id: z.union([z.string(), z.number()]),
  vendorId: z.string(),
  items: z.array(ItemSchema),
  timestamp: z.number(),
  // ...add more fields as needed
});
