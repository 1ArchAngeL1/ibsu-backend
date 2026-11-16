import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { CONTENT_MODEL, collectionGroups, findCollection } from "./catalogue";

/**
 * The admin reads the content model from here rather than importing it.
 *
 * That is what keeps the admin generic: it has no idea what an
 * announcement is, it renders whatever fields this describes. Adding a
 * collection to the model gives the admin a screen for it with no UI work.
 */
@Controller("content-model")
export class ContentModelController {
  @Get()
  model() {
    return CONTENT_MODEL;
  }

  @Get("groups")
  groups() {
    return collectionGroups().map((g) => ({
      group: g.group,
      collections: g.collections.map((c) => ({
        name: c.name,
        label: c.label,
        kind: c.kind,
        description: c.description ?? null,
      })),
    }));
  }

  @Get(":name")
  one(@Param("name") name: string) {
    const collection = findCollection(name);
    if (!collection) throw new NotFoundException(`No collection called ${name}.`);
    return collection;
  }
}
