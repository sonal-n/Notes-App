import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listNotes = query({
    args: { searchText: 
        v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const s = (args.searchText ?? "").toLowerCase();
        const all = await ctx.db.query("notes").order("desc").collect();
        const keep = all.filter(n => !n.trashed && (s === "" || n.title.toLowerCase().includes(s) || n.body.toLowerCase().includes(s)));
        return keep.sort((a, b) => b.updatedAt - a.updatedAt);
    },
})

export const createNote = mutation({
    args: { title: v.string(), body: v.string(), color: v.string() },
    handler: async (ctx, args) => {
        const title = args.title.trim() === "" ? "Untitled" : args.title.trim();
        const body = args.body;
        const color = args.color.trim() === "" ? "yellow" : args.color.trim();
        const now = Date.now();

        const id = await ctx.db.insert("notes", {
            title, body, color,
            pinned: false,
            trashed: false,
            tags: [],
            createdAt: now,
            updatedAt: now,
        });
        return id;
    },
});

export const updateNote = mutation({
    args: { id: v.id("notes"), title: v.string(), body: v.string() },
    handler: async (ctx, args) => {
        const title = args.title.trim() === "" ? "Untitled" : args.title.trim();
        const body = args.body;

        await ctx.db.patch(args.id, {title, body, updatedAt: Date.now()});
    },
});

const setPinned = mutation({
    args: { id: v.id("notes"), pinned: v.boolean() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {pinned: args.pinned, updatedAt: Date.now()});
    },
});

export const setColor = mutation ({
    args: { id: v.id("notes"), color: v.string() },
    handler: async (ctx, args) => {
        const allowed = ["yellow", "blue", "green", "purple", "grey"];
        const c = args.color.trim().toLowerCase();
        const color = allowed.includes(c) ? c: "yellow";
        
        await ctx.db.patch(args.id, {color, updatedAt: Date.now()});
    },
});

export const trashNote = mutation({
    args: { id: v.id("notes"), trashed: v.boolean() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {trashed: args.trashed, updatedAt: Date.now()});
    }
})

export const getNote = query({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});