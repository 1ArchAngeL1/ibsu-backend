import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ContentRecord,
  type ContentRecordDocument,
  type RecordStatus,
} from "../schemas/content-record.schema";
import { findCollection } from "../content-model/catalogue";
import type { CollectionDef, FieldDef } from "../content-model/types";
import { RevisionsService } from "../revisions/revisions.service";
import { AuditService } from "../revisions/audit.service";
import { PublishService } from "../publish/publish.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";

export type Row = Record<string, unknown>;

/** Mongo sort spec; `Row` is too loose for Mongoose to accept. */
type Sort = Record<string, 1 | -1>;

/**
 * One service for all 71 collections.
 *
 * Every method starts by looking the collection up in the content model and
 * refuses if it is not there. That is the whole of the authorization over
 * *shape*: a caller cannot invent a collection, cannot write a field the
 * model does not describe, and cannot put a string where the model says
 * number. Role checks (who may publish) are the guards' job, above this.
 */
@Injectable()
export class ContentService {
  constructor(
    @InjectModel(ContentRecord.name)
    private readonly records: Model<ContentRecordDocument>,
    private readonly revisions: RevisionsService,
    private readonly audit: AuditService,
    private readonly publisher: PublishService,
  ) {}

  private definition(name: string): CollectionDef {
    const collection = findCollection(name);
    if (!collection) throw new NotFoundException(`No collection called ${name}.`);
    return collection;
  }

  /* ------------------------------------------------------------- reading */

  async list(
    name: string,
    options: { status?: RecordStatus; search?: string; limit?: number; skip?: number } = {},
  ): Promise<{ total: number; records: ContentRecordDocument[]; collection: CollectionDef }> {
    const collection = this.definition(name);
    const filter: Row = { collectionName: name };
    if (options.status) filter.status = options.status;

    if (options.search) {
      /**
       * Content is free-form JSON, so there is no field to index for
       * search. Matching the serialized document is crude but it is what an
       * editor means by "find the announcement about the defence" — and at
       * a few hundred records per collection it costs nothing.
       */
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { key: { $regex: escaped, $options: "i" } },
        { $expr: { $regexMatch: { input: { $toString: "$data" }, regex: escaped, options: "i" } } },
      ];
    }

    const sort: Sort = collection.sortable
      ? { order: 1 }
      : collection.sortField
        ? { [`data.${collection.sortField}`]: collection.sortDirection === "asc" ? 1 : -1 }
        : { order: 1 };

    const [total, records] = await Promise.all([
      this.records.countDocuments(filter).exec(),
      this.records
        .find(filter)
        .sort(sort)
        .skip(options.skip ?? 0)
        .limit(Math.min(options.limit ?? 50, 500))
        .exec(),
    ]);
    return { total, records, collection };
  }

  async get(name: string, key: string): Promise<ContentRecordDocument> {
    this.definition(name);
    const record = await this.records.findOne({ collectionName: name, key }).exec();
    if (!record) throw new NotFoundException(`No ${name} record with the key ${key}.`);
    return record;
  }

  /** What the website reads: published content only, in order, flattened. */
  async published(name: string, includeDrafts = false): Promise<Row[]> {
    const collection = this.definition(name);
    const filter: Row = includeDrafts
      ? { collectionName: name, status: { $ne: "archived" } }
      : { collectionName: name, status: "published" };

    const sort: Sort = collection.sortable
      ? { order: 1 }
      : collection.sortField
        ? { [`data.${collection.sortField}`]: collection.sortDirection === "asc" ? 1 : -1 }
        : { order: 1 };

    // `lean` because nothing here needs a document: the website wants the
    // content, and hydrating 310 newsroom stories to throw the wrappers
    // away is work for nobody.
    const records = await this.records
      .find(filter)
      .sort(sort)
      .lean<{ data: Row | null; draft: Row | null }[]>()
      .exec();
    return records
      .map((r) => (includeDrafts ? (r.draft ?? r.data) : r.data))
      .filter((data): data is Row => data !== null && data !== undefined);
  }

  /* ------------------------------------------------------------- writing */

  async saveDraft(
    name: string,
    key: string,
    data: Row,
    actor?: AuthUser,
  ): Promise<ContentRecordDocument> {
    const collection = this.definition(name);
    const clean = validateRow(collection, data);

    const existing = await this.records.findOne({ collectionName: name, key }).exec();
    if (existing) {
      await this.revisions.snapshot({
        subject: "records",
        scope: name,
        target: key,
        snapshot: existing.draft ?? existing.data,
        action: "save",
        actor,
      });
      existing.draft = clean;
      existing.updatedBy = actor?.id;
      await existing.save();
      await this.audit.record(actor, "records.save", `${name}/${key}`);
      return existing;
    }

    const created = await this.records.create({
      collectionName: name,
      key,
      data: null,
      draft: clean,
      status: "draft",
      order: await this.nextOrder(name),
      updatedBy: actor?.id,
    });
    await this.audit.record(actor, "records.create", `${name}/${key}`);
    return created;
  }

  async publish(name: string, key: string, actor?: AuthUser): Promise<ContentRecordDocument> {
    const collection = this.definition(name);
    const record = await this.get(name, key);
    if (!record.draft && record.status === "published") {
      throw new BadRequestException("There is nothing waiting to be published.");
    }

    await this.revisions.snapshot({
      subject: "records",
      scope: name,
      target: key,
      snapshot: record.data,
      action: "publish",
      actor,
    });

    if (record.draft) record.data = record.draft;
    record.draft = null;
    record.status = "published";
    record.publishedAt = new Date();
    record.publishedBy = actor?.id;
    await record.save();

    await this.audit.record(actor, "records.publish", `${name}/${key}`);
    await this.publisher.revalidateCollection(name, collection.tags);
    return record;
  }

  /** Takes a record off the site without losing it. */
  async unpublish(name: string, key: string, actor?: AuthUser): Promise<ContentRecordDocument> {
    const collection = this.definition(name);
    const record = await this.get(name, key);

    await this.revisions.snapshot({
      subject: "records",
      scope: name,
      target: key,
      snapshot: record.data,
      action: "unpublish",
      actor,
    });

    // Keep the content as a draft, so unpublishing is not a way to lose it.
    record.draft = record.draft ?? record.data;
    record.status = "draft";
    await record.save();

    await this.audit.record(actor, "records.unpublish", `${name}/${key}`);
    await this.publisher.revalidateCollection(name, collection.tags);
    return record;
  }

  async archive(name: string, key: string, actor?: AuthUser): Promise<void> {
    const collection = this.definition(name);
    const record = await this.get(name, key);

    await this.revisions.snapshot({
      subject: "records",
      scope: name,
      target: key,
      snapshot: { data: record.data, draft: record.draft, status: record.status },
      action: "delete",
      actor,
    });

    /**
     * Archived, not removed. A record the site has linked to for a year is
     * not something to delete because somebody clicked the wrong row — and
     * the revision above is only useful if there is a record to restore it
     * onto.
     */
    record.status = "archived";
    record.draft = record.draft ?? record.data;
    await record.save();

    await this.audit.record(actor, "records.archive", `${name}/${key}`);
    await this.publisher.revalidateCollection(name, collection.tags);
  }

  async restore(
    name: string,
    key: string,
    revisionId: string,
    actor?: AuthUser,
  ): Promise<ContentRecordDocument> {
    const collection = this.definition(name);
    const revision = await this.revisions.get(revisionId);
    if (revision.scope !== name || revision.target !== key) {
      throw new BadRequestException("That revision belongs to a different record.");
    }
    const record = await this.get(name, key);

    await this.revisions.snapshot({
      subject: "records",
      scope: name,
      target: key,
      snapshot: record.draft ?? record.data,
      action: "restore",
      actor,
      note: `restored ${revisionId}`,
    });

    // Restoring puts the old content in the draft, not on the site. The
    // editor reads it back before anyone else does.
    record.draft = validateRow(collection, revision.snapshot as Row);
    record.updatedBy = actor?.id;
    await record.save();

    await this.audit.record(actor, "records.restore", `${name}/${key}`, { revisionId });
    return record;
  }

  async reorder(name: string, keys: string[], actor?: AuthUser): Promise<void> {
    const collection = this.definition(name);
    if (!collection.sortable) {
      throw new BadRequestException(
        `${collection.label} is ordered by ${collection.sortField ?? "its key"}, not by hand.`,
      );
    }
    await this.records.bulkWrite(
      keys.map((key, index) => ({
        updateOne: { filter: { collectionName: name, key }, update: { $set: { order: index } } },
      })),
    );
    await this.audit.record(actor, "records.reorder", name, { count: keys.length });
    await this.publisher.revalidateCollection(name, collection.tags);
  }

  /** Publishes everything with edits waiting, in one go. */
  async publishAll(name: string, actor?: AuthUser): Promise<number> {
    const collection = this.definition(name);
    const pending = await this.records
      .find({ collectionName: name, draft: { $ne: null } })
      .select("key")
      .exec();
    for (const record of pending) {
      await this.publish(name, record.key, actor);
    }
    await this.publisher.revalidateCollection(name, collection.tags);
    return pending.length;
  }

  async counts(name: string): Promise<{ total: number; published: number; pending: number }> {
    const [total, published, pending] = await Promise.all([
      this.records.countDocuments({ collectionName: name }).exec(),
      this.records.countDocuments({ collectionName: name, status: "published" }).exec(),
      this.records.countDocuments({ collectionName: name, draft: { $ne: null } }).exec(),
    ]);
    return { total, published, pending };
  }

  private async nextOrder(name: string): Promise<number> {
    const last = await this.records
      .findOne({ collectionName: name })
      .sort({ order: -1 })
      .select("order")
      .exec();
    return (last?.order ?? -1) + 1;
  }
}

/* ---------------------------------------------------------- validation */

/**
 * Keeps a record to the shape the model describes: unknown keys dropped,
 * values coerced where it is unambiguous, and anything that cannot be made
 * to fit reported by name rather than saved as a surprise.
 */
export function validateRow(collection: CollectionDef, data: Row): Row {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new BadRequestException("A record has to be an object.");
  }
  const problems: string[] = [];
  const clean = coerceFields(collection.fields, data, "", problems);
  if (problems.length > 0) {
    throw new BadRequestException(problems.slice(0, 12));
  }
  return clean;
}

function coerceFields(fields: FieldDef[], data: Row, trail: string, problems: string[]): Row {
  const out: Row = {};
  for (const field of fields) {
    // Sibling-localized fields are two keys in the data and one in the
    // model, so they are read and written under their real names.
    if (field.siblings) {
      for (const [, key] of Object.entries(field.siblings)) {
        const value = data[key];
        if (value === undefined) continue;
        if (typeof value !== "string" && value !== null) {
          problems.push(`${trail}${key} has to be text`);
          continue;
        }
        out[key] = value;
      }
      continue;
    }

    const value = data[field.name];
    const where = `${trail}${field.name}`;

    if (value === undefined) continue;
    if (value === null) {
      if (field.required && !field.nullable) problems.push(`${where} is needed`);
      out[field.name] = null;
      continue;
    }

    out[field.name] = coerceField(field, value, where, problems);
  }
  return out;
}

function coerceField(field: FieldDef, value: unknown, where: string, problems: string[]): unknown {
  if (field.localized) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      problems.push(`${where} needs a value per language`);
      return value;
    }
    const keys = field.localeKeys ?? { ka: "ka", en: "en" };
    const out: Record<string, string> = {};
    for (const key of Object.values(keys)) {
      const text = (value as Row)[key];
      if (text === undefined) continue;
      if (typeof text !== "string") {
        problems.push(`${where} (${key}) has to be text`);
        continue;
      }
      out[key] = text;
    }
    return out;
  }

  switch (field.kind) {
    case "number": {
      const n = typeof value === "string" ? Number(value) : value;
      if (typeof n !== "number" || !Number.isFinite(n)) {
        problems.push(`${where} has to be a number`);
        return value;
      }
      return n;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      if (value === "true" || value === "false") return value === "true";
      problems.push(`${where} has to be true or false`);
      return value;
    }
    case "select": {
      if (typeof value !== "string") {
        problems.push(`${where} has to be text`);
        return value;
      }
      if (field.options && !field.options.some((o) => o.value === value)) {
        problems.push(
          `${where} has to be one of ${field.options.map((o) => o.value).join(", ")}`,
        );
      }
      return value;
    }
    case "multiselect": {
      if (!Array.isArray(value)) {
        problems.push(`${where} has to be a list`);
        return value;
      }
      return value.filter((v) => typeof v === "string");
    }
    case "date": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
        problems.push(`${where} has to be a date like 2026-06-24`);
      }
      return value;
    }
    case "array": {
      if (!Array.isArray(value)) {
        problems.push(`${where} has to be a list`);
        return value;
      }
      if (field.fields) {
        return value.map((item, i) =>
          item !== null && typeof item === "object" && !Array.isArray(item)
            ? coerceFields(field.fields!, item as Row, `${where}[${i}].`, problems)
            : item,
        );
      }
      if (field.of) {
        return value.map((item, i) => coerceField(field.of!, item, `${where}[${i}]`, problems));
      }
      return value;
    }
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        problems.push(`${where} has to be a group of fields`);
        return value;
      }
      return field.fields ? coerceFields(field.fields, value as Row, `${where}.`, problems) : value;
    }
    case "json":
      return value;
    default: {
      if (typeof value !== "string") {
        problems.push(`${where} has to be text`);
        return value;
      }
      return value;
    }
  }
}
