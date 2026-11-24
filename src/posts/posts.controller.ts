import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post as HttpPost,
  Query,
} from "@nestjs/common";
import { PostsService } from "./posts.service";
import { CreatePostDto, ListPostsDto, UpdatePostDto } from "./dto";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";

/**
 * Posts: the WordPress content type.
 *
 * `/posts/published` is public, for the website to read a category's posts.
 * Everything else is the admin's, and writing needs the editor role.
 */
@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get("published")
  @Public()
  published(
    @Query("category") category?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
    /** drop the bodies: a listing never renders them */
    @Query("brief") brief?: string,
  ) {
    return this.posts.published(
      category,
      numberOr(limit, 50),
      numberOr(skip, 0),
      brief === "1" || brief === "true",
    );
  }

  @Get("tags/popular")
  popularTags(@Query("limit") limit?: string) {
    return this.posts.popularTags(limit ? Number(limit) : 20);
  }

  @Get("by-slug/:slug")
  @Public()
  bySlug(@Param("slug") slug: string) {
    return this.posts.publishedBySlug(slug);
  }

  @Get()
  list(@Query() query: ListPostsDto) {
    return this.posts.list({
      status: query.status,
      category: query.category,
      search: query.search,
      limit: query.limit ? Number(query.limit) : undefined,
      skip: query.skip ? Number(query.skip) : undefined,
    });
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.posts.get(id);
  }

  @HttpPost()
  @Roles("editor")
  create(@Body() body: CreatePostDto, @CurrentUser() user?: AuthUser) {
    return this.posts.create(body, user);
  }

  @Patch(":id")
  @Roles("editor")
  update(@Param("id") id: string, @Body() body: UpdatePostDto, @CurrentUser() user?: AuthUser) {
    return this.posts.update(id, body, user);
  }

  @HttpPost(":id/publish")
  @Roles("editor")
  publish(@Param("id") id: string, @CurrentUser() user?: AuthUser) {
    return this.posts.setStatus(id, "published", user);
  }

  @HttpPost(":id/unpublish")
  @Roles("editor")
  unpublish(@Param("id") id: string, @CurrentUser() user?: AuthUser) {
    return this.posts.setStatus(id, "draft", user);
  }

  @Delete(":id")
  @Roles("editor")
  async remove(@Param("id") id: string, @CurrentUser() user?: AuthUser) {
    await this.posts.remove(id, user);
    return { ok: true };
  }
}

function numberOr(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
