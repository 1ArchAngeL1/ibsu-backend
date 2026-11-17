import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";

/**
 * The placement categories.
 *
 * Reading is public: the website needs the list to render category pages,
 * and it is not secret. Writing needs the editor role, like every other
 * content change.
 */
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Public()
  list() {
    return this.categories.list();
  }

  @Post()
  @Roles("editor")
  create(@Body() body: CreateCategoryDto) {
    return this.categories.create(body);
  }

  @Patch(":slug")
  @Roles("editor")
  update(@Param("slug") slug: string, @Body() body: UpdateCategoryDto) {
    return this.categories.update(slug, body);
  }

  @Delete(":slug")
  @Roles("editor")
  async remove(@Param("slug") slug: string) {
    await this.categories.remove(slug);
    return { ok: true };
  }
}
