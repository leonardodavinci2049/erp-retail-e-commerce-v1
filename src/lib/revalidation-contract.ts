import "server-only";

import { z } from "zod";

const appConfigRevalidationSchema = z
  .object({
    module: z.literal("app-config"),
    scope: z.enum(["all", "configs", "menus"]),
  })
  .strict();

const productsRevalidationSchema = z
  .object({
    module: z.literal("products"),
    scope: z.enum([
      "all",
      "product-list",
      "product-detail",
      "product-sections",
    ]),
    productId: z.number().int().positive().optional(),
    productSlug: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.scope !== "product-detail" &&
      (value.productId !== undefined || value.productSlug !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "productId and productSlug are only accepted for product-detail",
        path: ["scope"],
      });
    }
  });

const taxonomyRevalidationSchema = z
  .object({
    module: z.literal("taxonomy"),
    scope: z.enum(["all", "taxonomy-menu", "taxonomy-details"]),
    taxonomyId: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.scope !== "taxonomy-details" && value.taxonomyId !== undefined) {
      context.addIssue({
        code: "custom",
        message: "taxonomyId is only accepted for taxonomy-details",
        path: ["scope"],
      });
    }
  });

export const revalidationRequestSchema = z.discriminatedUnion("module", [
  appConfigRevalidationSchema,
  productsRevalidationSchema,
  taxonomyRevalidationSchema,
]);

export type RevalidationRequest = z.infer<typeof revalidationRequestSchema>;

export const LEGACY_REVALIDATION_REQUEST = {
  module: "app-config",
  scope: "all",
} as const satisfies RevalidationRequest;
