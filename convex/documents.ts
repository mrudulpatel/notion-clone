import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const document = await ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId,
      isArchived: false,
      isPublished: false,
    });

    return document;
  },
});

export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument)
      )
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return docs;
  },
});

export const archive = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const existingDoc = await ctx.db.get(args.id);

    if (!existingDoc) throw new Error("Document not found");

    if (existingDoc.userId !== userId)
      throw new Error("You can only archive your own documents");

    const recursiveArchive = async (docId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", docId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchived: true,
        });

        await recursiveArchive(child._id);
      }
    };
    const doc = await ctx.db.patch(args.id, {
      isArchived: true,
    });

    recursiveArchive(args.id);

    return doc;
  },
});

export const getTrash = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .order("desc")
      .collect();

    return docs;
  },
});

export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const existingDoc = await ctx.db.get(args.id);

    if (!existingDoc) throw new Error("Document not found");

    if (existingDoc.userId !== userId)
      throw new Error("You can only restore your own documents");

    const recursiveRestore = async (docId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", userId).eq("parentDocument", docId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchived: false,
        });

        await recursiveRestore(child._id);
      }
    };

    const options: Partial<Doc<"documents">> = {
      isArchived: false,
    };
    if (existingDoc.parentDocument) {
      const parent = await ctx.db.get(existingDoc.parentDocument);
      if (parent?.isArchived) {
        options.parentDocument = undefined;
      }
    }

    const doc = await ctx.db.patch(args.id, options);

    recursiveRestore(args.id);

    return doc;
  },
});

export const remove = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const existingDoc = await ctx.db.get(args.id);

    if (!existingDoc) throw new Error("Document not found");

    if (existingDoc.userId !== userId) {
      throw new Error("You can only delete your own documents");
    }

    const doc = await ctx.db.delete(args.id);

    return doc;
  },
});

export const getSearch = query({
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const doc = await ctx.db.get(args.documentId);

    if (!doc) throw new Error("Document not found");

    if (doc?.isPublished && !doc.isArchived) {
      return doc;
    }

    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    if (doc.userId !== userId)
      throw new Error("You do not have access to this document");

    return doc;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    content: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("Not Authenticated");

    const userId = identity.subject;

    const { id, ...rest } = args;
    const existingDoc = await ctx.db.get(args.id);

    if (!existingDoc) throw new Error("Document not found");

    if (existingDoc.userId !== userId)
      throw new Error("You can only update your own documents");

    const document = await ctx.db.patch(args.id, { ...rest });

    return document;
  },
});
