/**
 * Seeds the placement categories, taken from the live WordPress site's
 * category list (the schools, the news kinds, the sections).
 *
 *     tsx tools/seed-categories.ts
 *
 * Upserts by slug, so running it twice is safe and never clobbers a name an
 * editor has since changed — it only fills in what is missing.
 */
import mongoose from "mongoose";
import { CategorySchema } from "../src/schemas/category.schema";

interface Seed {
  slug: string;
  ka: string;
  en: string;
}

// Order groups them the way the WordPress editor saw them: the news kinds,
// then the schools, then the standing sections.
const CATEGORIES: Seed[] = [
  { slug: "news", ka: "სიახლეები", en: "News" },
  { slug: "scientific-news", ka: "სამეცნიერო სიახლეები", en: "Scientific news" },
  { slug: "ibsu-blog", ka: "IBSU ბლოგი", en: "IBSU blog" },
  { slug: "newspaper", ka: "IBSU გაზეთი", en: "IBSU newspaper" },
  { slug: "ibsu-in-media", ka: "IBSU მედიაში", en: "IBSU in the media" },
  { slug: "school-of-business", ka: "ბიზნესის სკოლა", en: "School of Business" },
  {
    slug: "school-of-education-humanities-and-social-sciences",
    ka: "განათლების, ჰუმანიტარულ და სოციალურ მეცნიერებათა სკოლა",
    en: "School of Education, Humanities and Social Sciences",
  },
  {
    slug: "school-of-computer-science-and-architecture",
    ka: "კომპიუტერული მეცნიერების და არქიტექტურის სკოლა",
    en: "School of Computer Science and Architecture",
  },
  {
    slug: "law-and-state-governance-school",
    ka: "სამართლის და სახელმწიფო მმართველობის სკოლა",
    en: "School of Law and State Governance",
  },
  { slug: "medicine-school", ka: "მედიცინის სკოლა", en: "School of Medicine" },
  { slug: "international-relations", ka: "საერთაშორისო ურთიერთობები", en: "International relations" },
  { slug: "career-planning-service", ka: "კარიერის დაგეგმვის სამსახური", en: "Career planning service" },
  { slug: "students-life", ka: "სტუდენტური ცხოვრება", en: "Student life" },
  { slug: "ibsu-alumni", ka: "კურსდამთავრებულთა ერთობა", en: "IBSU Alumni association" },
  { slug: "alumni", ka: "კურსდამთავრებულები", en: "Alumni" },
];

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ibsu";
  await mongoose.connect(uri);
  const Category = mongoose.model("Category", CategorySchema);

  let created = 0;
  for (const [index, seed] of CATEGORIES.entries()) {
    const result = await Category.updateOne(
      { slug: seed.slug },
      {
        $setOnInsert: {
          slug: seed.slug,
          name: { ka: seed.ka, en: seed.en },
          parent: null,
          order: index,
          description: { ka: "", en: "" },
        },
      },
      { upsert: true },
    ).exec();
    if (result.upsertedCount) created += 1;
  }

  console.log(`categories: ${created} created, ${CATEGORIES.length - created} already there`);
  await mongoose.disconnect();
}

void main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
