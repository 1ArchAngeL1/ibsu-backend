import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import slugify from "slugify";
import { Category, type CategoryDocument } from "../schemas/category.schema";
import { Post, type PostDocument } from "../schemas/post.schema";

export interface CategoryView {
  slug: string;
  name: { ka: string; en: string };
  parent: string | null;
  order: number;
  description: { ka: string; en: string };
  /** how many posts are filed under this category, in any status */
  count: number;
}

/**
 * The placement vocabulary.
 *
 * Categories are the one thing a post picks from to decide where it shows.
 * The list is read on every post-editor open and on the categories screen,
 * so it carries a post count per category the way WordPress's does.
 */
@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categories: Model<CategoryDocument>,
    @InjectModel(Post.name) private readonly posts: Model<PostDocument>,
  ) {}

  async list(): Promise<CategoryView[]> {
    const [categories, counts] = await Promise.all([
      this.categories.find().sort({ order: 1, "name.en": 1 }).lean().exec(),
      this.posts.aggregate<{ _id: string; n: number }>([
        { $unwind: "$categories" },
        { $group: { _id: "$categories", n: { $sum: 1 } } },
      ]),
    ]);
    const countBy = new Map(counts.map((c) => [c._id, c.n]));
    return categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      parent: c.parent,
      order: c.order,
      description: c.description ?? { ka: "", en: "" },
      count: countBy.get(c.slug) ?? 0,
    }));
  }

  async create(input: {
    name: { ka: string; en: string };
    slug?: string;
    parent?: string;
    order?: number;
    description?: { ka: string; en: string };
  }): Promise<CategoryDocument> {
    const base = input.slug?.trim() || input.name.en || input.name.ka;
    const slug = slugify(base, { lower: true, strict: true });
    if (!slug) throw new ConflictException("A category needs a name to make a slug from.");
    if (await this.categories.exists({ slug })) {
      throw new ConflictException(`A category with the slug "${slug}" already exists.`);
    }
    return this.categories.create({
      slug,
      name: input.name,
      parent: input.parent ?? null,
      order: input.order ?? 0,
      description: input.description ?? { ka: "", en: "" },
    });
  }

  async update(
    slug: string,
    input: {
      name?: { ka: string; en: string };
      parent?: string;
      order?: number;
      description?: { ka: string; en: string };
    },
  ): Promise<CategoryDocument> {
    const category = await this.categories.findOne({ slug }).exec();
    if (!category) throw new NotFoundException(`No category "${slug}".`);
    if (input.name) category.name = input.name;
    if (input.parent !== undefined) category.parent = input.parent || null;
    if (input.order !== undefined) category.order = input.order;
    if (input.description) category.description = input.description;
    await category.save();
    return category;
  }

  async remove(slug: string): Promise<void> {
    const result = await this.categories.deleteOne({ slug }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`No category "${slug}".`);
    // Leave the slug on any posts that still carry it: removing a category
    // is rare, and a dangling slug is harmless — it just places nothing.
  }
}
