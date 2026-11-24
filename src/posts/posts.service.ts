import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import slugify from "slugify";
import {
  Post,
  type PostDocument,
  type PostStatus,
  type PostVisibility,
} from "../schemas/post.schema";
import { AuditService } from "../revisions/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreatePostDto, UpdatePostDto } from "./dto";

export interface PostSummary {
  id: string;
  slug: string;
  title: { ka: string; en: string };
  status: PostStatus;
  /** derived: status "published" but `publishedAt` is still in the future */
  scheduled: boolean;
  visibility: PostVisibility;
  sticky: boolean;
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
  password: string;
  allowComments: boolean;
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
    const post = new this.posts({
      slug,
      title,
      excerpt: input.excerpt ?? EMPTY,
      body: input.body ?? EMPTY,
      cover: input.cover ? input.cover : null,
      categories: input.categories ?? [],
      tags: input.tags ?? [],
      status: input.status === "published" ? "published" : "draft",
      authorName: actor?.name ?? null,
      authorId: actor?.id,
    });
    this.applyMeta(post, input);
    await post.save();
    await this.audit.record(
      actor,
      `post.${post.status === "published" ? "publish" : "create"}`,
      slug,
      { title },
    );
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
    if (input.status) post.status = input.status;
    this.applyMeta(post, input);

    await post.save();
    await this.audit.record(actor, "post.update", post.slug, { title: post.title });
    return full(post);
  }

  /**
   * The Publish-box fields: visibility, password, the sticky flag, comments,
   * and the publish date. A future date is a scheduled post; an empty string
   * clears the schedule (publish now if live, otherwise no date). When the
   * date is left out entirely, a first publish stamps now.
   */
  private applyMeta(post: PostDocument, input: UpdatePostDto): void {
    if (input.visibility) post.visibility = input.visibility;
    if (input.password !== undefined) post.password = input.password;
    if (post.visibility !== "password") post.password = "";
    if (input.sticky !== undefined) post.sticky = input.sticky;
    if (input.allowComments !== undefined) post.allowComments = input.allowComments;

    if (input.publishedAt !== undefined) {
      const when = input.publishedAt ? new Date(input.publishedAt) : null;
      post.publishedAt =
        when && !Number.isNaN(when.getTime())
          ? when
          : post.status === "published"
            ? new Date()
            : null;
    } else if (post.status === "published" && !post.publishedAt) {
      post.publishedAt = new Date();
    }
  }

  /** The most-used tags, for the "choose from the most used" cloud. */
  async popularTags(limit = 20): Promise<{ tag: string; count: number }[]> {
    const rows = await this.posts.aggregate<{ _id: string; n: number }>([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: Math.min(Math.max(limit, 1), 100) },
    ]);
    return rows.map((r) => ({ tag: r._id, count: r.n }));
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

  /**
   * What the website would read: live posts, newest first, by category.
   * A scheduled post (publish date in the future) and a private or
   * password-protected one are held back — only genuinely public, due posts.
   */
  async published(category?: string, limit = 50, skip = 0): Promise<PostFull[]> {
    const filter: Record<string, unknown> = {
      status: "published",
      visibility: { $nin: ["private", "password"] },
      publishedAt: { $lte: new Date() },
    };
    /*
     * One category, or several that must all be present. The school pages
     * ask for "this school AND news" — a post filed under the school but
     * not under news is a vacancy notice or a defence, not news from the
     * school — and a single term could not express that.
     *
     * `$all` rather than `$in`: `$in` would widen the result to anything
     * carrying either term, which for `news` is 1,162 posts and the
     * opposite of what the caller asked for.
     */
    const wanted = (category ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (wanted.length === 1) filter.categories = wanted[0];
    else if (wanted.length > 1) filter.categories = { $all: wanted };
    const docs = await this.posts
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip(Math.max(skip, 0))
      .limit(Math.min(Math.max(limit, 1), 200))
      .exec();
    return docs.map(full);
  }

  /** One live post by slug, for the website's post page. Null if not public. */
  async publishedBySlug(slug: string): Promise<PostFull | null> {
    const doc = await this.posts
      .findOne({
        slug,
        status: "published",
        visibility: { $nin: ["private", "password"] },
        publishedAt: { $lte: new Date() },
      })
      .exec();
    return doc ? full(doc) : null;
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
  const publishedAt = doc.publishedAt ? doc.publishedAt.toISOString() : null;
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    status: doc.status,
    scheduled: doc.status === "published" && !!doc.publishedAt && doc.publishedAt > new Date(),
    visibility: doc.visibility,
    sticky: doc.sticky,
    categories: doc.categories,
    tags: doc.tags,
    cover: doc.cover,
    authorName: doc.authorName,
    publishedAt,
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
    password: doc.password,
    allowComments: doc.allowComments,
    sourceData: doc.source?.data ?? null,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
