import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { title } from "process";

export default defineSchema({
  notes: defineTable({
    title: v.string(),
    body: v.string(),
    pinned: v.boolean(),
    color: v.string(),
    tags: v.array(v.string()),
    trashed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
});
