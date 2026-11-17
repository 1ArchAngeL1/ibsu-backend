import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import slugify from "slugify";
import { Post, type PostDocument, type PostStatus } from "../schemas/post.schema";
import { AuditService } from "../revisions/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreatePostDto, UpdatePostDto } from "./dto";

export interface PostSummary {
  id: string;
  slug: string;
  title: { ka: string; en: string };
  status: PostStatus;
  categories: string[];
  tags: string[];
  cover: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  /** set when this post was migrated from a `records` collection */
  source: { collection: string; label: string; key: string } | null;
}

export interface PostFull extends PostSummary {
  excerpt: { ka: string; en: string };
  body: { ka: string; en: string };
  /** the full original record, for a migrated post; null for native posts */
  sourceData: Record<string, unknown> | null;
}

const EMPTY = { ka: "", en: "" };

/**
 * Posts: author once, place by category.
 *
 * Saving and publishing are the same call with a different `status`, because
 * a post has no draft-beside-published split — it is new content, not an
 * edit to a live page, so "draft" simply means the site does not show it
 * yet. Every write is noted in the audit trail so posts show up in the
 * admin's "Lately" beside everything else.
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly posts: Model<PostDocument>,
    private readonly audit: AuditService,
  ) {}

  async list(options: {
    status?: string;
    category?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ total: number; posts: PostSummary[] }> {
    const filter: Record<string, unknown> = {};
    if (options.status === "draft" || options.status === "published") {
      filter.status = options.status;
    }
    if (options.category) filter.categories = options.category;
    if (options.search) {
      const rx = new RegExp(escapeRegExp(options.search), "i");
      filter.$or = [{ "title.ka": rx }, { "title.en": rx }, { slug: rx }];
    }

    // The admin's one screen shows every post, migrated records included, so
    // the cap is high; the payload is summaries, not bodies.
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 5000);
    const skip = Math.max(options.skip ?? 0, 0);
    const [total, docs] = await Promise.all([
      this.posts.countDocuments(filter),
      this.posts.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec(),
    ]);
    return { total, posts: docs.map(summary) };
  }

  async get(id: string): Promise<PostFull> {
    const post = await this.byId(id);
    return full(post);
  }

  async create(input: CreatePostDto, actor?: AuthUser): Promise<PostFull> {
    const title = input.title ?? EMPTY;
    const slug = await this.uniqueSlug(input.slug?.trim() || title.en || title.ka);
    const status: PostStatus = input.status === "published" ? "published" : "draft";
    const post = await this.posts.create({
      slug,
      title,
      excerpt: input.excerpt ?? EMPTY,
      body: input.body ?? EMPTY,
      cover: input.cover ? input.cover : null,
      categories: input.categories ?? [],
      tags: input.tags ?? [],
      status,
      publishedAt: status === "published" ? new Date() : null,
      authorName: actor?.name ?? null,
      authorId: actor?.id,
    });
    await this.audit.record(actor, `post.${status === "published" ? "publish" : "create"}`, slug, {
      title,
    });
    return full(post);
  }

  async update(id: string, input: UpdatePostDto, actor?: AuthUser): Promise<PostFull> {
    const post = await this.byId(id);

    if (input.slug && input.slug.trim() && input.slug.trim() !== post.slug) {
      post.slug = await this.uniqueSlug(input.slug.trim(), post.id);
    }
    if (input.title) post.title = input.title;
    if (input.excerpt) post.excerpt = input.excerpt;
    if (input.body) post.body = input.body;
    if (input.cover !== undefined) post.cover = input.cover ? input.cover : null;
    if (input.categories) post.categories = input.categories;
    if (input.tags) post.tags = input.tags;

    if (input.status && input.status !== post.status) {
      post.status = input.status;
      if (input.status === "published" && !post.publishedAt) post.publishedAt = new Date();
    }

    await post.save();
    await this.audit.record(actor, "post.update", post.slug, { title: post.title });
    return full(post);
  }

  async setStatus(id: string, status: PostStatus, actor?: AuthUser): Promise<PostFull> {
    const post = await this.byId(id);
    post.status = status;
    if (status === "published" && !post.publishedAt) post.publishedAt = new Date();
    await post.save();
    await this.audit.record(actor, `post.${status === "published" ? "publish" : "unpublish"}`, post.slug);
    return full(post);
  }

  async remove(id: string, actor?: AuthUser): Promise<void> {
    const post = await this.byId(id);
    await post.deleteOne();
    await this.audit.record(actor, "post.delete", post.slug);
  }

  /** What the website would read: published posts, newest first, by category. */
  async published(category?: string, limit = 50, skip = 0): Promise<PostFull[]> {
    const filter: Record<string, unknown> = { status: "published" };
    if (category) filter.categories = category;
    const docs = await this.posts
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip(Math.max(skip, 0))
      .limit(Math.min(Math.max(limit, 1), 200))
      .exec();
    return docs.map(full);
  }

  private async byId(id: string): Promise<PostDocument> {
    const post = await this.posts.findById(id).exec().catch(() => null);
    if (!post) throw new NotFoundException(`No post with id ${id}.`);
    return post;
  }

  /** `title` → `title`, `title-2`, … — unique, ignoring one post's own row. */
  private async uniqueSlug(base: string, exceptId?: string): Promise<string> {
    const root = slugify(base || "post", { lower: true, strict: true }) || "post";
    let slug = root;
    for (let n = 2; ; n += 1) {
      const clash = await this.posts.findOne({ slug }).select("_id").exec();
      if (!clash || (exceptId && String(clash._id) === exceptId)) return slug;
      slug = `${root}-${n}`;
    }
  }
}

function summary(doc: PostDocument): PostSummary {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    status: doc.status,
    categories: doc.categories,
    tags: doc.tags,
    cover: doc.cover,
    authorName: doc.authorName,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    updatedAt: (doc as { updatedAt?: Date }).updatedAt?.toISOString() ?? new Date().toISOString(),
    source: doc.source
      ? { collection: doc.source.collection, label: doc.source.label, key: doc.source.key }
      : null,
  };
}

function full(doc: PostDocument): PostFull {
  return {
    ...summary(doc),
    excerpt: doc.excerpt,
    body: doc.body,
    sourceData: doc.source?.data ?? null,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
