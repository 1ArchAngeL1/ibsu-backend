/**
 * GENERATED — do not edit by hand.
 *
 * Written by `tools/infer-content-model.ts` from the content that used to
 * live in `src/data`. Re-run it after re-extracting; to change a label, a
 * field kind or an ordering, patch it in `catalogue.ts` instead, which is
 * applied on top of this and is not generated.
 *
 * 72 collections, 490 top-level fields.
 */
import type { CollectionDef } from "./types";

export const GENERATED_COLLECTIONS: CollectionDef[] = [
    {
      "name": "homeNews",
      "label": "Home page news",
      "group": "News",
      "kind": "list",
      "description": "The three stories in the home page's news band.",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "news",
        "home"
      ],
      "legacyModule": "src/data/index.ts",
      "routes": [
        "/",
        "/news/[id]"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "tags",
          "label": "Tags",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "readMinutes",
          "label": "Read minutes",
          "required": true,
          "kind": "number",
          "listColumn": true
        }
      ]
    },
    {
      "name": "scientificNews",
      "label": "Scientific news",
      "group": "News",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "news"
      ],
      "legacyModule": "src/data/index.ts",
      "routes": [
        "/news/scientific",
        "/news/[id]"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "tags",
          "label": "Tags",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "readMinutes",
          "label": "Read minutes",
          "required": true,
          "kind": "number",
          "listColumn": true
        }
      ]
    },
    {
      "name": "events",
      "label": "Events",
      "group": "News",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "asc",
      "tags": [
        "events",
        "home"
      ],
      "legacyModule": "src/data/index.ts",
      "routes": [
        "/events",
        "/events/[id]"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "day",
          "label": "Day",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "month",
          "label": "Month",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "time",
          "label": "Time",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "place",
          "label": "Place",
          "required": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "announcements",
      "label": "Announcements",
      "group": "News",
      "kind": "list",
      "description": "The official notices on /news/announcements.",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "announcements"
      ],
      "legacyModule": "src/data/announcements.ts",
      "routes": [
        "/news/announcements"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "category",
          "label": "Category",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "competitions",
              "label": "Competitions"
            },
            {
              "value": "defences",
              "label": "Defences"
            },
            {
              "value": "exchange",
              "label": "Exchange"
            },
            {
              "value": "general",
              "label": "General"
            },
            {
              "value": "other",
              "label": "Other"
            }
          ],
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "kind",
          "label": "Kind",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "unit",
          "label": "Unit",
          "required": false,
          "nullable": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "excerpt",
          "label": "Excerpt",
          "required": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "deskStories",
      "label": "News desk stories",
      "group": "News",
      "kind": "list",
      "description": "The five news desks: university, schools, international, scientific, student.",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "news",
        "desks"
      ],
      "legacyModule": "src/data/newsDesks.ts",
      "routes": [
        "/news",
        "/news/[desk]"
      ],
      "fields": [
        {
          "name": "desk",
          "label": "Desk",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "international",
              "label": "International"
            },
            {
              "value": "schools",
              "label": "Schools"
            },
            {
              "value": "scientific",
              "label": "Scientific"
            },
            {
              "value": "student",
              "label": "Student"
            },
            {
              "value": "university",
              "label": "University"
            }
          ],
          "listColumn": true
        },
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "cats",
          "label": "Categories",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "tags",
          "label": "Tags",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "href",
          "label": "Link",
          "required": false,
          "nullable": true,
          "kind": "select",
          "options": [
            {
              "value": "/international/experiences",
              "label": "/international/experiences"
            },
            {
              "value": "/news/announcements#defences",
              "label": "/news/announcements#defences"
            },
            {
              "value": "/research",
              "label": "/research"
            },
            {
              "value": "/research/journals/jebs",
              "label": "/research/journals/jebs"
            },
            {
              "value": "/research/journals/jtst",
              "label": "/research/journals/jtst"
            },
            {
              "value": "/schools/business",
              "label": "/schools/business"
            },
            {
              "value": "/schools/computing",
              "label": "/schools/computing"
            },
            {
              "value": "/schools/eduhum",
              "label": "/schools/eduhum"
            },
            {
              "value": "/schools/law",
              "label": "/schools/law"
            },
            {
              "value": "/schools/medicine",
              "label": "/schools/medicine"
            },
            {
              "value": "/student",
              "label": "/student"
            },
            {
              "value": "/student/life#clubs",
              "label": "/student/life#clubs"
            }
          ],
          "listColumn": true
        }
      ]
    },
    {
      "name": "deskTags",
      "label": "News desk tag labels",
      "group": "News",
      "kind": "singleton",
      "description": "The tag vocabulary the desk filters are labelled from.",
      "titleField": "id",
      "tags": [
        "news",
        "desks"
      ],
      "legacyModule": "src/data/newsDesks.ts",
      "fields": [
        {
          "name": "accreditation",
          "label": "Accreditation",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "admission",
          "label": "Admission",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "blackSea",
          "label": "Black sea",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "campus",
          "label": "Campus",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "ceremony",
          "label": "Ceremony",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "community",
          "label": "Community",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "competition",
          "label": "Competition",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "conference",
          "label": "Conference",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "consortium",
          "label": "Consortium",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "debateClub",
          "label": "Debate club",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "delegation",
          "label": "Delegation",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "doctoralDefence",
          "label": "Doctoral defence",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "doubleDegree",
          "label": "Double degree",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "entrepreneurship",
          "label": "Entrepreneurship",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "erasmus",
          "label": "Erasmus",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "europe",
          "label": "Europe",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "exchange",
          "label": "Exchange",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "facilities",
          "label": "Facilities",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "france",
          "label": "France",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "graduation",
          "label": "Graduation",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "grant",
          "label": "Grant",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "humanities",
          "label": "Humanities",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "incoming",
          "label": "Incoming",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "international",
          "label": "International",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "interview",
          "label": "Interview",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "jebs",
          "label": "Jebs",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "journal",
          "label": "Journal",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "jtst",
          "label": "Jtst",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "memorandum",
          "label": "Memorandum",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "mit",
          "label": "Mit",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "mobility",
          "label": "Mobility",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "outreach",
          "label": "Outreach",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "partnership",
          "label": "Partnership",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "research",
          "label": "Research",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "students",
          "label": "Students",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "university",
          "label": "University",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "usa",
          "label": "Usa",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "volunteering",
          "label": "Volunteering",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "business",
          "label": "Business",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "school",
              "label": "School",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "law",
          "label": "Law",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "school",
              "label": "School",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "education",
          "label": "Education",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "school",
              "label": "School",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "computing",
          "label": "Computing",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "school",
              "label": "School",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "architecture",
          "label": "Architecture",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "school",
              "label": "School",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "medicine",
          "label": "Medicine",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "school",
              "label": "School",
              "required": true,
              "kind": "text"
            }
          ]
        }
      ]
    },
    {
      "name": "mediaCoverage",
      "label": "In the media",
      "group": "News",
      "kind": "list",
      "description": "Outside coverage of the university, on /news/in-the-media.",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "news",
        "coverage"
      ],
      "legacyModule": "src/data/newsDesks.ts",
      "routes": [
        "/news/in-the-media"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "outlet",
          "label": "Outlet",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "aris",
              "label": "Aris"
            },
            {
              "value": "bmg",
              "label": "Bmg"
            },
            {
              "value": "entrepreneur",
              "label": "Entrepreneur"
            },
            {
              "value": "ipn",
              "label": "Ipn"
            },
            {
              "value": "other",
              "label": "Other"
            }
          ],
          "listColumn": true
        },
        {
          "name": "outletName",
          "label": "Outlet name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "topic",
          "label": "Topic",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "topicTone",
          "label": "Topic tone",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "amber",
              "label": "Amber"
            },
            {
              "value": "pink",
              "label": "Pink"
            }
          ]
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "excerpt",
          "label": "Excerpt",
          "required": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "iroNews",
      "label": "International news",
      "group": "News",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "news",
        "iro"
      ],
      "legacyModule": "src/data/iroNews.ts",
      "routes": [
        "/international/news",
        "/news/international"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3,
          "listColumn": true
        },
        {
          "name": "excerpt",
          "label": "Excerpt",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": false,
          "nullable": true,
          "kind": "image"
        },
        {
          "name": "w",
          "label": "W",
          "required": false,
          "nullable": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "h",
          "label": "H",
          "required": false,
          "nullable": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "href",
          "label": "Link",
          "required": true,
          "kind": "url"
        }
      ]
    },
    {
      "name": "careerNews",
      "label": "Career centre news",
      "group": "News",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "news",
        "career"
      ],
      "legacyModule": "src/data/careerNews.ts",
      "routes": [
        "/student/career"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3,
          "listColumn": true
        },
        {
          "name": "excerpt",
          "label": "Excerpt",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "href",
          "label": "Link",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        }
      ]
    },
    {
      "name": "mediaStories",
      "label": "Newsroom stories",
      "group": "Newsroom",
      "kind": "list",
      "description": "The Media Club's 310 stories across seven desks.",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "media"
      ],
      "legacyModule": "src/data/media.ts",
      "routes": [
        "/news/media",
        "/news/media/[desk]",
        "/news/media/stories/[id]"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "cats",
          "label": "Categories",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "tags",
          "label": "Tags",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "read",
          "label": "Read",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "format",
          "label": "Format",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "article",
              "label": "Article"
            },
            {
              "value": "photo",
              "label": "Photo"
            },
            {
              "value": "print",
              "label": "Print"
            },
            {
              "value": "video",
              "label": "Video"
            }
          ],
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "en",
          "label": "English",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "textarea",
              "rows": 3
            },
            {
              "name": "excerpt",
              "label": "Excerpt",
              "required": true,
              "kind": "textarea",
              "rows": 3
            }
          ]
        },
        {
          "name": "ge",
          "label": "Georgian",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "textarea",
              "rows": 3
            },
            {
              "name": "excerpt",
              "label": "Excerpt",
              "required": true,
              "kind": "textarea",
              "rows": 3
            }
          ]
        }
      ]
    },
    {
      "name": "mediaBodies",
      "label": "Newsroom story bodies",
      "group": "Newsroom",
      "kind": "list",
      "description": "The text of each story, kept apart from the cards: the page carries the cards and fetches a body only when a reader opens one.",
      "titleField": "storyId",
      "keyField": "storyId",
      "tags": [
        "media"
      ],
      "legacyModule": "src/data/media.ts",
      "routes": [
        "/api/media/story/[id]"
      ],
      "fields": [
        {
          "name": "storyId",
          "label": "Story ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "blocks",
          "label": "Blocks",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "t",
              "label": "T",
              "required": true,
              "kind": "text"
            },
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "textarea",
              "rows": 3
            },
            {
              "name": "ge",
              "label": "Georgian",
              "required": true,
              "kind": "textarea",
              "rows": 3
            }
          ]
        }
      ]
    },
    {
      "name": "mediaColumnBodies",
      "label": "Newsroom column bodies",
      "group": "Newsroom",
      "kind": "list",
      "description": "The columns' own text. Keyed by kind rather than by id, and matched to the column by position, which is how the prototype stored it.",
      "titleField": "columnKind",
      "tags": [
        "media"
      ],
      "legacyModule": "src/data/media.ts",
      "routes": [
        "/news/media/club"
      ],
      "fields": [
        {
          "name": "columnKind",
          "label": "Column kind",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "blog",
              "label": "Blog"
            },
            {
              "value": "column",
              "label": "Column"
            },
            {
              "value": "online",
              "label": "Online"
            },
            {
              "value": "profile",
              "label": "Profile"
            }
          ],
          "listColumn": true
        },
        {
          "name": "index",
          "label": "Index",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "blocks",
          "label": "Blocks",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "t",
              "label": "T",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "img",
                  "label": "Image"
                },
                {
                  "value": "p",
                  "label": "P"
                }
              ]
            },
            {
              "name": "src",
              "label": "Image",
              "required": false,
              "nullable": true,
              "kind": "image"
            },
            {
              "name": "en",
              "label": "English",
              "required": false,
              "nullable": true,
              "kind": "textarea",
              "rows": 3
            },
            {
              "name": "ge",
              "label": "Georgian",
              "required": false,
              "nullable": true,
              "kind": "textarea",
              "rows": 3
            }
          ]
        }
      ]
    },
    {
      "name": "mediaColumns",
      "label": "Newsroom columns",
      "group": "Newsroom",
      "kind": "list",
      "titleField": "title",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "media"
      ],
      "legacyModule": "src/data/media.ts",
      "routes": [
        "/news/media/club"
      ],
      "fields": [
        {
          "name": "columnKind",
          "label": "Column kind",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "blog",
              "label": "Blog"
            },
            {
              "value": "column",
              "label": "Column"
            },
            {
              "value": "online",
              "label": "Online"
            },
            {
              "value": "profile",
              "label": "Profile"
            }
          ],
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": false,
          "nullable": true,
          "kind": "image"
        },
        {
          "name": "en",
          "label": "English",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "text"
            },
            {
              "name": "author",
              "label": "Author",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "IBSU Media Centre",
                  "label": "Ibsu media centre"
                },
                {
                  "value": "Nini Shaorshadze",
                  "label": "Nini shaorshadze"
                }
              ]
            }
          ]
        },
        {
          "name": "ge",
          "label": "Georgian",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "text"
            },
            {
              "name": "author",
              "label": "Author",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "IBSU მედია ცენტრი",
                  "label": "Ibsu მედია ცენტრი"
                },
                {
                  "value": "ნინი შაორშაძე",
                  "label": "Ნინი შაორშაძე"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "theses",
      "label": "Student theses",
      "group": "Newsroom",
      "kind": "list",
      "titleField": "title",
      "tags": [
        "media"
      ],
      "legacyModule": "src/data/media.ts",
      "routes": [
        "/news/media/theses"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": false,
          "nullable": true,
          "kind": "image"
        },
        {
          "name": "body",
          "label": "Body",
          "required": false,
          "nullable": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "href",
          "label": "Link",
          "required": false,
          "nullable": true,
          "kind": "url"
        },
        {
          "name": "site",
          "label": "Site",
          "required": false,
          "nullable": true,
          "kind": "url"
        },
        {
          "name": "works",
          "label": "Works",
          "required": false,
          "nullable": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            },
            {
              "name": "by",
              "label": "By",
              "required": false,
              "nullable": true,
              "kind": "text",
              "localized": true
            }
          ]
        },
        {
          "name": "note",
          "label": "Note",
          "required": false,
          "nullable": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        }
      ]
    },
    {
      "name": "studentPosts",
      "label": "Student posts",
      "group": "Newsroom",
      "kind": "list",
      "titleField": "title",
      "tags": [
        "media"
      ],
      "legacyModule": "src/data/media.ts",
      "routes": [
        "/news/media/students"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "author",
          "label": "Author",
          "required": false,
          "nullable": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        }
      ]
    },
    {
      "name": "programmes",
      "label": "Programme catalogue",
      "group": "Academics",
      "kind": "list",
      "description": "Every programme the university runs, with its level, school, languages and accreditation expiry.",
      "titleField": "name",
      "tags": [
        "programmes"
      ],
      "legacyModule": "src/data/sources/programmes.json",
      "routes": [
        "/study/programmes",
        "/schools/[school]"
      ],
      "fields": [
        {
          "name": "lvl",
          "label": "Level",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "bachelor",
              "label": "Bachelor"
            },
            {
              "value": "doctorate",
              "label": "Doctorate"
            },
            {
              "value": "master",
              "label": "Master"
            },
            {
              "value": "medical",
              "label": "Medical"
            },
            {
              "value": "teacher",
              "label": "Teacher"
            }
          ],
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "school",
          "label": "School",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "Computer Science & Architecture",
              "label": "Computer science & architecture"
            },
            {
              "value": "Education & Humanities",
              "label": "Education & humanities"
            },
            {
              "value": "School of Business",
              "label": "School of business"
            },
            {
              "value": "School of Law",
              "label": "School of law"
            },
            {
              "value": "School of Medicine",
              "label": "School of medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "langs",
          "label": "Langs",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "acc",
          "label": "Accreditation expiry",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "isNew",
          "label": "Is new",
          "required": false,
          "nullable": true,
          "kind": "boolean"
        },
        {
          "name": "href",
          "label": "Link",
          "required": false,
          "nullable": true,
          "kind": "text"
        }
      ]
    },
    {
      "name": "programmeDetails",
      "label": "Programme pages",
      "group": "Academics",
      "kind": "list",
      "description": "The objective, study plan, careers and admission text on a programme's own page.",
      "titleField": "programmeKey",
      "keyField": "programmeKey",
      "tags": [
        "programmes"
      ],
      "legacyModule": "src/data/programmeDetails.ts",
      "routes": [
        "/study/programmes/[level]/[slug]"
      ],
      "fields": [
        {
          "name": "programmeKey",
          "label": "Programme key",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "image",
          "label": "Image",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "src",
              "label": "Image",
              "required": true,
              "kind": "image"
            },
            {
              "name": "alt",
              "label": "Alt",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        },
        {
          "name": "objective",
          "label": "Objective",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "study",
          "label": "Study",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "intro",
              "label": "Intro",
              "required": true,
              "kind": "textarea",
              "localized": true,
              "rows": 3
            },
            {
              "name": "items",
              "label": "Items",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text",
                "localized": true
              }
            }
          ]
        },
        {
          "name": "careers",
          "label": "Careers",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "admission",
          "label": "Admission",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "qualification",
          "label": "Qualification",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "degree",
              "label": "Degree",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "rest",
              "label": "Rest",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        },
        {
          "name": "qualificationShort",
          "label": "Qualification short",
          "required": true,
          "kind": "text",
          "listColumn": true
        }
      ]
    },
    {
      "name": "schoolDeans",
      "label": "School deans",
      "group": "Academics",
      "kind": "list",
      "titleField": "name",
      "keyField": "school",
      "tags": [
        "schools"
      ],
      "legacyModule": "src/data/schools.ts",
      "routes": [
        "/schools/[school]"
      ],
      "fields": [
        {
          "name": "school",
          "label": "School",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "computing",
              "label": "Computing"
            },
            {
              "value": "eduhum",
              "label": "Eduhum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "medicine",
              "label": "Medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "initials",
          "label": "Initials",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "role",
          "label": "Role",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "quote",
          "label": "Quote",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        }
      ]
    },
    {
      "name": "schoolFacultyCards",
      "label": "School faculty cards",
      "group": "Academics",
      "kind": "list",
      "description": "The representative academic staff shown on a school's own page.",
      "titleField": "name",
      "tags": [
        "schools"
      ],
      "legacyModule": "src/data/schools.ts",
      "routes": [
        "/schools/[school]"
      ],
      "fields": [
        {
          "name": "school",
          "label": "School",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "computing",
              "label": "Computing"
            },
            {
              "value": "eduhum",
              "label": "Eduhum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "medicine",
              "label": "Medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "staffId",
          "label": "Staff ID",
          "required": false,
          "nullable": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "initials",
          "label": "Initials",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "role",
          "label": "Role",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "field",
          "label": "Field",
          "required": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "schoolNews",
      "label": "School news",
      "group": "Academics",
      "kind": "list",
      "titleField": "title",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "schools",
        "news"
      ],
      "legacyModule": "src/data/schools.ts",
      "routes": [
        "/schools/[school]"
      ],
      "fields": [
        {
          "name": "school",
          "label": "School",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "computing",
              "label": "Computing"
            },
            {
              "value": "eduhum",
              "label": "Eduhum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "medicine",
              "label": "Medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "tag",
          "label": "Tag",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "schoolHeroImages",
      "label": "School hero photographs",
      "group": "Academics",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "schools"
      ],
      "legacyModule": "src/data/schools.ts",
      "routes": [
        "/schools/[school]"
      ],
      "fields": [
        {
          "name": "business",
          "label": "Business",
          "required": true,
          "kind": "image"
        },
        {
          "name": "law",
          "label": "Law",
          "required": true,
          "kind": "image"
        },
        {
          "name": "eduhum",
          "label": "Eduhum",
          "required": true,
          "kind": "image"
        },
        {
          "name": "computing",
          "label": "Computing",
          "required": true,
          "kind": "image"
        },
        {
          "name": "medicine",
          "label": "Medicine",
          "required": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "schoolFacultyRoster",
      "label": "Faculty roster",
      "group": "Academics",
      "kind": "list",
      "description": "The full academic staff of each school, by rank.",
      "titleField": "name",
      "tags": [
        "schools",
        "faculty"
      ],
      "legacyModule": "src/data/faculty.ts",
      "routes": [
        "/schools/[school]/faculty"
      ],
      "fields": [
        {
          "name": "school",
          "label": "School",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "computing",
              "label": "Computing"
            },
            {
              "value": "eduhum",
              "label": "Eduhum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "medicine",
              "label": "Medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "rank",
          "label": "Rank",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "affiliatedAssociate",
              "label": "Affiliated associate"
            },
            {
              "value": "affiliatedProfessor",
              "label": "Affiliated professor"
            },
            {
              "value": "assistant",
              "label": "Assistant"
            },
            {
              "value": "associate",
              "label": "Associate"
            },
            {
              "value": "head",
              "label": "Head"
            },
            {
              "value": "professor",
              "label": "Professor"
            }
          ],
          "listColumn": true
        },
        {
          "name": "initials",
          "label": "Initials",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "note",
          "label": "Note",
          "required": false,
          "nullable": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "staffProfiles",
      "label": "Staff profiles",
      "group": "Academics",
      "kind": "list",
      "description": "The pages at /staff/<id>.",
      "titleField": "name",
      "keyField": "id",
      "tags": [
        "staff"
      ],
      "legacyModule": "src/data/sources/staff.json",
      "routes": [
        "/staff/[id]"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "portrait",
          "label": "Portrait",
          "required": true,
          "kind": "image"
        },
        {
          "name": "name",
          "label": "Name",
          "kind": "text",
          "localized": true,
          "siblings": {
            "ka": "nameka",
            "en": "name"
          },
          "listColumn": true
        },
        {
          "name": "role",
          "label": "Role",
          "kind": "text",
          "localized": true,
          "siblings": {
            "ka": "roleka",
            "en": "role"
          },
          "listColumn": true
        },
        {
          "name": "field",
          "label": "Field",
          "kind": "text",
          "localized": true,
          "siblings": {
            "ka": "fieldka",
            "en": "field"
          },
          "listColumn": true
        },
        {
          "name": "school",
          "label": "School",
          "kind": "text",
          "localized": true,
          "siblings": {
            "ka": "schoolka",
            "en": "school"
          },
          "listColumn": true
        },
        {
          "name": "schoolHref",
          "label": "School Link",
          "required": true,
          "kind": "text"
        },
        {
          "name": "lead",
          "label": "Lead",
          "kind": "textarea",
          "localized": true,
          "siblings": {
            "ka": "leadka",
            "en": "lead"
          },
          "rows": 3
        },
        {
          "name": "bio",
          "label": "Bio",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "stats",
          "label": "Stats",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "n",
              "label": "N",
              "required": true,
              "kind": "text"
            },
            {
              "name": "l",
              "label": "L",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "lka",
                "en": "l"
              }
            }
          ]
        },
        {
          "name": "research",
          "label": "Research",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "t",
              "label": "T",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "tka",
                "en": "t"
              }
            },
            {
              "name": "d",
              "label": "D",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "dka",
                "en": "d"
              }
            }
          ]
        },
        {
          "name": "teaching",
          "label": "Teaching",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "c",
              "label": "C",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "cka",
                "en": "c"
              }
            },
            {
              "name": "lvl",
              "label": "Level",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "lvlka",
                "en": "lvl"
              }
            }
          ]
        },
        {
          "name": "pubs",
          "label": "Publications",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "y",
              "label": "Y",
              "required": true,
              "kind": "text"
            },
            {
              "name": "t",
              "label": "T",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "tka",
                "en": "t"
              }
            },
            {
              "name": "v",
              "label": "V",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "vka",
                "en": "v"
              }
            }
          ]
        },
        {
          "name": "contact",
          "label": "Contact",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "email",
              "label": "Email",
              "required": true,
              "kind": "email"
            },
            {
              "name": "phone",
              "label": "Phone",
              "required": true,
              "kind": "tel"
            },
            {
              "name": "ext",
              "label": "Ext",
              "required": true,
              "kind": "text"
            },
            {
              "name": "office",
              "label": "Office",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "officeka",
                "en": "office"
              }
            },
            {
              "name": "hours",
              "label": "Hours",
              "kind": "text",
              "localized": true,
              "siblings": {
                "ka": "hourska",
                "en": "hours"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "staffOrder",
      "label": "Staff profile order",
      "group": "Academics",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "staff"
      ],
      "legacyModule": "src/data/sources/staff.json",
      "fields": [
        {
          "name": "0",
          "label": "0",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "1",
          "label": "1",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "2",
          "label": "2",
          "required": true,
          "kind": "text",
          "listColumn": true
        }
      ]
    },
    {
      "name": "electiveSubjects",
      "label": "Elective subjects",
      "group": "Academics",
      "kind": "list",
      "titleField": "key",
      "keyField": "key",
      "sortable": true,
      "tags": [
        "programmes"
      ],
      "legacyModule": "src/data/electiveSubjects.ts",
      "routes": [
        "/applicants/choose-profession"
      ],
      "fields": [
        {
          "name": "key",
          "label": "Key",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "programmes",
          "label": "Programmes",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        }
      ]
    },
    {
      "name": "academicCalendar",
      "label": "Academic calendar",
      "group": "Academics",
      "kind": "list",
      "titleField": "key",
      "sortable": true,
      "tags": [
        "calendar"
      ],
      "legacyModule": "src/data/academicCalendar.ts",
      "routes": [
        "/student/academic-calendar"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "rows",
          "label": "Rows",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "date",
              "label": "Date",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        }
      ]
    },
    {
      "name": "academicCalendarMeta",
      "label": "Academic year",
      "group": "Academics",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "calendar"
      ],
      "legacyModule": "src/data/academicCalendar.ts",
      "fields": [
        {
          "name": "YEAR",
          "label": "Year",
          "required": true,
          "kind": "text",
          "listColumn": true
        }
      ]
    },
    {
      "name": "tuitionSchools",
      "label": "Tuition by school",
      "group": "Tuition",
      "kind": "list",
      "titleField": "school",
      "sortable": true,
      "tags": [
        "tuition"
      ],
      "legacyModule": "src/data/tuition.ts",
      "routes": [
        "/applicants/tuition"
      ],
      "fields": [
        {
          "name": "key",
          "label": "Key",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "rows",
          "label": "Rows",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "text"
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "text"
            },
            {
              "name": "taught",
              "label": "Taught",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            },
            {
              "name": "gel",
              "label": "Gel",
              "required": true,
              "kind": "number"
            },
            {
              "name": "usd",
              "label": "Usd",
              "required": false,
              "nullable": true,
              "kind": "number"
            },
            {
              "name": "years",
              "label": "Years",
              "required": false,
              "nullable": true,
              "kind": "number"
            },
            {
              "name": "unconfirmed",
              "label": "Unconfirmed",
              "required": false,
              "nullable": true,
              "kind": "boolean"
            }
          ]
        }
      ]
    },
    {
      "name": "grants",
      "label": "Grant options",
      "group": "Tuition",
      "kind": "list",
      "titleField": "key",
      "sortable": true,
      "tags": [
        "tuition"
      ],
      "legacyModule": "src/data/tuition.ts",
      "routes": [
        "/applicants/grants-calculator"
      ],
      "fields": [
        {
          "name": "key",
          "label": "Key",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "en",
          "label": "English",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "ka",
          "label": "Georgian",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "discount",
          "label": "Discount",
          "required": true,
          "kind": "number",
          "listColumn": true
        }
      ]
    },
    {
      "name": "tuitionRules",
      "label": "Tuition rules",
      "group": "Tuition",
      "kind": "singleton",
      "description": "The first-choice discount, the GPA threshold for keeping a grant, and the default programme length.",
      "titleField": "id",
      "tags": [
        "tuition"
      ],
      "legacyModule": "src/data/tuition.ts",
      "fields": [
        {
          "name": "FIRST_CHOICE_DISCOUNT",
          "label": "First choice discount",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "GPA_RETENTION_THRESHOLD",
          "label": "GPA retention threshold",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "DEFAULT_YEARS",
          "label": "Default years",
          "required": true,
          "kind": "number",
          "listColumn": true
        }
      ]
    },
    {
      "name": "programmeTuition",
      "label": "Programme fees",
      "group": "Tuition",
      "kind": "list",
      "description": "The yearly fee of each programme, keyed by level and slug.",
      "titleField": "programmeKey",
      "keyField": "programmeKey",
      "tags": [
        "tuition",
        "programmes"
      ],
      "legacyModule": "src/data/programmeTuition.ts",
      "fields": [
        {
          "name": "programmeKey",
          "label": "Programme key",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "level",
          "label": "Level",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "bachelor",
              "label": "Bachelor"
            },
            {
              "value": "medical",
              "label": "Medical"
            }
          ],
          "listColumn": true
        },
        {
          "name": "slug",
          "label": "Slug",
          "required": true,
          "kind": "text",
          "listColumn": true
        }
      ]
    },
    {
      "name": "researchProjects",
      "label": "Research projects",
      "group": "Research",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "tags": [
        "research"
      ],
      "legacyModule": "src/data/researchProjects.ts",
      "routes": [
        "/research/projects"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "status",
          "label": "Status",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "completed",
              "label": "Completed"
            },
            {
              "value": "ongoing",
              "label": "Ongoing"
            }
          ],
          "listColumn": true
        },
        {
          "name": "international",
          "label": "International",
          "required": true,
          "kind": "boolean",
          "listColumn": true
        },
        {
          "name": "fund",
          "label": "Fund",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "summary",
          "label": "Summary",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "tags",
          "label": "Tags",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "books",
      "label": "Books",
      "group": "Research",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "year",
      "sortDirection": "desc",
      "tags": [
        "research",
        "books"
      ],
      "legacyModule": "src/data/books.ts",
      "routes": [
        "/research/books"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "byline",
          "label": "Byline",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "school",
          "label": "School",
          "required": false,
          "nullable": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "computing",
              "label": "Computing"
            },
            {
              "value": "eduhum",
              "label": "Eduhum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "medicine",
              "label": "Medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "format",
          "label": "Format",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "collection",
              "label": "Collection"
            },
            {
              "value": "monograph",
              "label": "Monograph"
            },
            {
              "value": "textbook",
              "label": "Textbook"
            }
          ],
          "listColumn": true
        },
        {
          "name": "year",
          "label": "Year",
          "required": true,
          "kind": "number",
          "listColumn": true
        }
      ]
    },
    {
      "name": "featuredBook",
      "label": "Featured book",
      "group": "Research",
      "kind": "singleton",
      "titleField": "title",
      "tags": [
        "research",
        "books"
      ],
      "legacyModule": "src/data/books.ts",
      "routes": [
        "/research/books"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "format",
          "label": "Format",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "year",
          "label": "Year",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "publisher",
          "label": "Publisher",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "subject",
          "label": "Subject",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "blurb",
          "label": "Blurb",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        }
      ]
    },
    {
      "name": "conferences",
      "label": "Conferences",
      "group": "Research",
      "kind": "list",
      "description": "Each conference's own site: hero, sections, committees, fees and archive.",
      "titleField": "title",
      "keyField": "slug",
      "tags": [
        "conferences"
      ],
      "legacyModule": "src/data/conferences.ts",
      "routes": [
        "/research/conferences",
        "/research/conferences/[slug]"
      ],
      "fields": [
        {
          "name": "slug",
          "label": "Slug",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "template",
          "label": "Template",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "detail",
              "label": "Detail"
            },
            {
              "value": "subsite",
              "label": "Subsite"
            }
          ],
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "lede",
          "label": "Lede",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "image",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "sections",
          "label": "Sections",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "kind",
              "label": "Kind",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "about",
                  "label": "About"
                },
                {
                  "value": "archive",
                  "label": "Archive"
                },
                {
                  "value": "boards",
                  "label": "Boards"
                },
                {
                  "value": "countdown",
                  "label": "Countdown"
                },
                {
                  "value": "dates",
                  "label": "Dates"
                },
                {
                  "value": "fees",
                  "label": "Fees"
                },
                {
                  "value": "form",
                  "label": "Form"
                },
                {
                  "value": "guidelines",
                  "label": "Guidelines"
                },
                {
                  "value": "intro",
                  "label": "Intro"
                },
                {
                  "value": "links",
                  "label": "Links"
                },
                {
                  "value": "numbered",
                  "label": "Numbered"
                },
                {
                  "value": "partners",
                  "label": "Partners"
                },
                {
                  "value": "schedule",
                  "label": "Schedule"
                },
                {
                  "value": "speakers",
                  "label": "Speakers"
                },
                {
                  "value": "timeline",
                  "label": "Timeline"
                },
                {
                  "value": "topics",
                  "label": "Topics"
                }
              ]
            },
            {
              "name": "id",
              "label": "ID",
              "required": true,
              "kind": "text"
            },
            {
              "name": "tone",
              "label": "Tone",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "dark",
                  "label": "Dark"
                },
                {
                  "value": "gray",
                  "label": "Gray"
                },
                {
                  "value": "paper",
                  "label": "Paper"
                }
              ]
            },
            {
              "name": "nav",
              "label": "Nav",
              "required": false,
              "nullable": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "heading",
              "label": "Heading",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "pill",
              "label": "Pill",
              "required": false,
              "nullable": true,
              "kind": "object",
              "fields": [
                {
                  "name": "href",
                  "label": "Link",
                  "required": true,
                  "kind": "select",
                  "options": [
                    {
                      "value": "/research/conferences",
                      "label": "/research/conferences"
                    },
                    {
                      "value": "/research/journals",
                      "label": "/research/journals"
                    }
                  ]
                },
                {
                  "name": "label",
                  "label": "Label",
                  "required": true,
                  "kind": "text",
                  "localized": true
                }
              ]
            },
            {
              "name": "lede",
              "label": "Lede",
              "required": false,
              "nullable": true,
              "kind": "textarea",
              "localized": true,
              "rows": 3
            },
            {
              "name": "stats",
              "label": "Stats",
              "required": false,
              "nullable": true,
              "kind": "array",
              "fields": [
                {
                  "name": "value",
                  "label": "Value",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "label",
                  "label": "Label",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "accent",
                  "label": "Accent",
                  "required": false,
                  "nullable": true,
                  "kind": "boolean"
                }
              ]
            },
            {
              "name": "tag",
              "label": "Tag",
              "required": false,
              "nullable": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "items",
              "label": "Items",
              "required": false,
              "nullable": true,
              "kind": "array",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "body",
                  "label": "Body",
                  "required": false,
                  "nullable": true,
                  "kind": "textarea",
                  "localized": true,
                  "rows": 3
                },
                {
                  "name": "en",
                  "label": "English",
                  "required": false,
                  "nullable": true,
                  "kind": "textarea",
                  "rows": 3
                },
                {
                  "name": "ka",
                  "label": "Georgian",
                  "required": false,
                  "nullable": true,
                  "kind": "textarea",
                  "rows": 3
                },
                {
                  "name": "initials",
                  "label": "Initials",
                  "required": false,
                  "nullable": true,
                  "kind": "text"
                },
                {
                  "name": "country",
                  "label": "Country",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "name",
                  "label": "Name",
                  "required": false,
                  "nullable": true,
                  "kind": "json"
                },
                {
                  "name": "affiliation",
                  "label": "Affiliation",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "talk",
                  "label": "Talk",
                  "required": false,
                  "nullable": true,
                  "kind": "text"
                },
                {
                  "name": "mark",
                  "label": "Mark",
                  "required": false,
                  "nullable": true,
                  "kind": "text"
                },
                {
                  "name": "href",
                  "label": "Link",
                  "required": false,
                  "nullable": true,
                  "kind": "url"
                }
              ]
            },
            {
              "name": "image",
              "label": "Image",
              "required": false,
              "nullable": true,
              "kind": "image"
            },
            {
              "name": "cells",
              "label": "Cells",
              "required": false,
              "nullable": true,
              "kind": "array",
              "fields": [
                {
                  "name": "label",
                  "label": "Label",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "value",
                  "label": "Value",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "hot",
                  "label": "Hot",
                  "required": false,
                  "nullable": true,
                  "kind": "boolean"
                }
              ]
            },
            {
              "name": "note",
              "label": "Note",
              "required": false,
              "nullable": true,
              "kind": "object",
              "fields": [
                {
                  "name": "text",
                  "label": "Text",
                  "required": true,
                  "kind": "textarea",
                  "localized": true,
                  "rows": 3
                },
                {
                  "name": "email",
                  "label": "Email",
                  "required": true,
                  "kind": "email"
                }
              ]
            },
            {
              "name": "rows",
              "label": "Rows",
              "required": false,
              "nullable": true,
              "kind": "array",
              "fields": [
                {
                  "name": "year",
                  "label": "Year",
                  "required": false,
                  "nullable": true,
                  "kind": "select",
                  "options": [
                    {
                      "value": "2019",
                      "label": "2019"
                    },
                    {
                      "value": "2021",
                      "label": "2021"
                    },
                    {
                      "value": "2022",
                      "label": "2022"
                    },
                    {
                      "value": "2023",
                      "label": "2023"
                    },
                    {
                      "value": "2024",
                      "label": "2024"
                    },
                    {
                      "value": "2025",
                      "label": "2025"
                    },
                    {
                      "value": "2026",
                      "label": "2026"
                    }
                  ]
                },
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "meta",
                  "label": "Meta",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "links",
                  "label": "Links",
                  "required": false,
                  "nullable": true,
                  "kind": "array",
                  "fields": [
                    {
                      "name": "doc",
                      "label": "Doc",
                      "required": false,
                      "nullable": true,
                      "kind": "select",
                      "options": [
                        {
                          "value": "abstracts",
                          "label": "Abstracts"
                        },
                        {
                          "value": "proceedings",
                          "label": "Proceedings"
                        },
                        {
                          "value": "program",
                          "label": "Program"
                        }
                      ]
                    },
                    {
                      "name": "href",
                      "label": "Link",
                      "required": true,
                      "kind": "url"
                    }
                  ]
                },
                {
                  "name": "tag",
                  "label": "Tag",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "href",
                  "label": "Link",
                  "required": false,
                  "nullable": true,
                  "kind": "select",
                  "options": [
                    {
                      "value": "/international/partners",
                      "label": "/international/partners"
                    },
                    {
                      "value": "/research/conferences",
                      "label": "/research/conferences"
                    },
                    {
                      "value": "/research/journals",
                      "label": "/research/journals"
                    },
                    {
                      "value": "/schools/eduhum",
                      "label": "/schools/eduhum"
                    },
                    {
                      "value": "/study/doctorate",
                      "label": "/study/doctorate"
                    }
                  ]
                },
                {
                  "name": "when",
                  "label": "When",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "body",
                  "label": "Body",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "time",
                  "label": "Time",
                  "required": false,
                  "nullable": true,
                  "kind": "text"
                }
              ]
            },
            {
              "name": "contact",
              "label": "Contact",
              "required": false,
              "nullable": true,
              "kind": "object",
              "fields": [
                {
                  "name": "text",
                  "label": "Text",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "email",
                  "label": "Email",
                  "required": true,
                  "kind": "email"
                }
              ]
            },
            {
              "name": "boards",
              "label": "Boards",
              "required": false,
              "nullable": true,
              "kind": "array",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "members",
                  "label": "Members",
                  "required": true,
                  "kind": "array",
                  "fields": [
                    {
                      "name": "name",
                      "label": "Name",
                      "required": true,
                      "kind": "text"
                    },
                    {
                      "name": "role",
                      "label": "Role",
                      "required": true,
                      "kind": "text",
                      "localized": true
                    }
                  ]
                }
              ]
            },
            {
              "name": "cards",
              "label": "Cards",
              "required": false,
              "nullable": true,
              "kind": "array",
              "fields": [
                {
                  "name": "marker",
                  "label": "Marker",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "price",
                  "label": "Price",
                  "required": false,
                  "nullable": true,
                  "kind": "text"
                },
                {
                  "name": "body",
                  "label": "Body",
                  "required": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "title",
                  "label": "Title",
                  "required": false,
                  "nullable": true,
                  "kind": "text",
                  "localized": true
                },
                {
                  "name": "action",
                  "label": "Action",
                  "required": false,
                  "nullable": true,
                  "kind": "object",
                  "fields": [
                    {
                      "name": "label",
                      "label": "Label",
                      "required": true,
                      "kind": "text",
                      "localized": true
                    },
                    {
                      "name": "href",
                      "label": "Link",
                      "required": true,
                      "kind": "email"
                    }
                  ]
                }
              ]
            },
            {
              "name": "after",
              "label": "After",
              "required": false,
              "nullable": true,
              "kind": "textarea",
              "localized": true,
              "rows": 3
            },
            {
              "name": "email",
              "label": "Email",
              "required": false,
              "nullable": true,
              "kind": "email"
            },
            {
              "name": "statement",
              "label": "Statement",
              "required": false,
              "nullable": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "paragraphs",
              "label": "Paragraphs",
              "required": false,
              "nullable": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text",
                "localized": true
              }
            },
            {
              "name": "target",
              "label": "Target",
              "required": false,
              "nullable": true,
              "kind": "date"
            },
            {
              "name": "line",
              "label": "Line",
              "required": false,
              "nullable": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "continues",
              "label": "Continues",
              "required": false,
              "nullable": true,
              "kind": "boolean"
            }
          ]
        },
        {
          "name": "accent",
          "label": "Accent",
          "required": false,
          "nullable": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "palette",
          "label": "Palette",
          "required": false,
          "nullable": true,
          "kind": "object",
          "fields": [
            {
              "name": "accent",
              "label": "Accent",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "gold",
              "label": "Gold",
              "required": true,
              "kind": "color"
            },
            {
              "name": "gold2",
              "label": "Gold2",
              "required": true,
              "kind": "color"
            }
          ]
        },
        {
          "name": "chips",
          "label": "Chips",
          "required": false,
          "nullable": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "facts",
          "label": "Facts",
          "required": false,
          "nullable": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "value",
              "label": "Value",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        }
      ]
    },
    {
      "name": "conferenceLogos",
      "label": "Conference logos",
      "group": "Research",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "conferences"
      ],
      "legacyModule": "src/data/conferences.ts",
      "fields": [
        {
          "name": "american-studies",
          "label": "American studies",
          "required": true,
          "kind": "image"
        },
        {
          "name": "student",
          "label": "Student",
          "required": true,
          "kind": "image"
        },
        {
          "name": "halc",
          "label": "Halc",
          "required": true,
          "kind": "image"
        },
        {
          "name": "young-researchers",
          "label": "Young researchers",
          "required": true,
          "kind": "image"
        },
        {
          "name": "silk-road",
          "label": "Silk road",
          "required": true,
          "kind": "image"
        },
        {
          "name": "irceelt",
          "label": "Irceelt",
          "required": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "journals",
      "label": "Journals",
      "group": "Research",
      "kind": "list",
      "description": "The five template journals: scope, board, indexing and issues.",
      "titleField": "title",
      "keyField": "journalId",
      "tags": [
        "journals"
      ],
      "legacyModule": "src/data/journals.ts",
      "routes": [
        "/research/journals",
        "/research/journals/[id]"
      ],
      "fields": [
        {
          "name": "journalId",
          "label": "Journal ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "url",
          "label": "URL",
          "required": true,
          "kind": "url"
        },
        {
          "name": "accent",
          "label": "Accent",
          "required": true,
          "kind": "color"
        },
        {
          "name": "accentDark",
          "label": "Accent dark",
          "required": true,
          "kind": "color"
        },
        {
          "name": "abbr",
          "label": "Abbr",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "listColumn": true
        },
        {
          "name": "field",
          "label": "Field",
          "required": true,
          "kind": "text",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "listColumn": true
        },
        {
          "name": "issn",
          "label": "ISSN",
          "required": true,
          "kind": "text"
        },
        {
          "name": "eissn",
          "label": "eISSN",
          "required": true,
          "kind": "text"
        },
        {
          "name": "doi",
          "label": "DOI",
          "required": true,
          "kind": "text"
        },
        {
          "name": "freq",
          "label": "Frequency",
          "required": true,
          "kind": "text",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          }
        },
        {
          "name": "since",
          "label": "Since",
          "required": true,
          "kind": "number"
        },
        {
          "name": "scope",
          "label": "Scope",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "rows": 3
        },
        {
          "name": "topics",
          "label": "Topics",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            },
            {
              "name": "ge",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            }
          ]
        },
        {
          "name": "editor",
          "label": "Editor",
          "required": true,
          "kind": "text",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          }
        },
        {
          "name": "board",
          "label": "Board",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            },
            {
              "name": "ge",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            }
          ]
        },
        {
          "name": "indexing",
          "label": "Indexing",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "stats",
          "label": "Stats",
          "required": false,
          "nullable": true,
          "kind": "object",
          "fields": [
            {
              "name": "issue",
              "label": "Issue",
              "required": true,
              "kind": "text",
              "localized": true,
              "localeKeys": {
                "ka": "ge",
                "en": "en"
              }
            },
            {
              "name": "submitted",
              "label": "Submitted",
              "required": true,
              "kind": "number"
            },
            {
              "name": "accepted",
              "label": "Accepted",
              "required": true,
              "kind": "number"
            },
            {
              "name": "rejected",
              "label": "Rejected",
              "required": true,
              "kind": "number"
            },
            {
              "name": "rejection",
              "label": "Rejection",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "callForPapers",
          "label": "Call for papers",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "rows": 3
        },
        {
          "name": "issues",
          "label": "Issues",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "vol",
              "label": "Vol",
              "required": true,
              "kind": "text"
            },
            {
              "name": "year",
              "label": "Year",
              "required": true,
              "kind": "number"
            },
            {
              "name": "current",
              "label": "Current",
              "required": false,
              "nullable": true,
              "kind": "boolean"
            },
            {
              "name": "articles",
              "label": "Articles",
              "required": true,
              "kind": "array",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text",
                  "localized": true,
                  "localeKeys": {
                    "ka": "ge",
                    "en": "en"
                  }
                },
                {
                  "name": "authors",
                  "label": "Authors",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "pages",
                  "label": "Pages",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "name": "rich",
          "label": "Rich",
          "required": false,
          "nullable": true,
          "kind": "boolean"
        }
      ]
    },
    {
      "name": "journalShades",
      "label": "Journal colours",
      "group": "Research",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "journals"
      ],
      "legacyModule": "src/data/journals.ts",
      "fields": [
        {
          "name": "clj",
          "label": "CLJ",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "sc",
              "label": "Sc",
              "required": true,
              "kind": "color"
            },
            {
              "name": "soft",
              "label": "Soft",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "bright",
              "label": "Bright",
              "required": true,
              "kind": "color"
            }
          ]
        },
        {
          "name": "jebs",
          "label": "Jebs",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "sc",
              "label": "Sc",
              "required": true,
              "kind": "color"
            },
            {
              "name": "soft",
              "label": "Soft",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "bright",
              "label": "Bright",
              "required": true,
              "kind": "color"
            }
          ]
        },
        {
          "name": "jh",
          "label": "Jh",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "sc",
              "label": "Sc",
              "required": true,
              "kind": "color"
            },
            {
              "name": "soft",
              "label": "Soft",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "bright",
              "label": "Bright",
              "required": true,
              "kind": "color"
            }
          ]
        },
        {
          "name": "jb",
          "label": "Jb",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "sc",
              "label": "Sc",
              "required": true,
              "kind": "color"
            },
            {
              "name": "soft",
              "label": "Soft",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "bright",
              "label": "Bright",
              "required": true,
              "kind": "color"
            }
          ]
        },
        {
          "name": "jtst",
          "label": "Jtst",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "sc",
              "label": "Sc",
              "required": true,
              "kind": "color"
            },
            {
              "name": "soft",
              "label": "Soft",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "bright",
              "label": "Bright",
              "required": true,
              "kind": "color"
            }
          ]
        },
        {
          "name": "jss",
          "label": "Jss",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "sc",
              "label": "Sc",
              "required": true,
              "kind": "color"
            },
            {
              "name": "soft",
              "label": "Soft",
              "required": true,
              "kind": "color"
            },
            {
              "name": "ink",
              "label": "Ink",
              "required": true,
              "kind": "color"
            },
            {
              "name": "bright",
              "label": "Bright",
              "required": true,
              "kind": "color"
            }
          ]
        }
      ]
    },
    {
      "name": "cljIssues",
      "label": "Caucasus Law Journal issues",
      "group": "Research",
      "kind": "list",
      "titleField": "label",
      "sortable": true,
      "tags": [
        "journals"
      ],
      "legacyModule": "src/data/journals.ts",
      "routes": [
        "/research/journals/clj"
      ],
      "fields": [
        {
          "name": "year",
          "label": "Year",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "host",
          "label": "Host",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "pdf",
              "label": "Pdf"
            },
            {
              "value": "platform",
              "label": "Platform"
            }
          ],
          "listColumn": true
        },
        {
          "name": "href",
          "label": "Link",
          "required": true,
          "kind": "url"
        }
      ]
    },
    {
      "name": "cljMeta",
      "label": "Caucasus Law Journal",
      "group": "Research",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "journals"
      ],
      "legacyModule": "src/data/journals.ts",
      "fields": [
        {
          "name": "abbr",
          "label": "Abbr",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "field",
          "label": "Field",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        }
      ]
    },
    {
      "name": "cljEditor",
      "label": "Caucasus Law Journal editor",
      "group": "Research",
      "kind": "singleton",
      "titleField": "name",
      "tags": [
        "journals"
      ],
      "legacyModule": "src/data/journals.ts",
      "fields": [
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "initials",
          "label": "Initials",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "role",
          "label": "Role",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "email",
          "label": "Email",
          "required": true,
          "kind": "email"
        }
      ]
    },
    {
      "name": "vitascopeIssues",
      "label": "Vitascope issues",
      "group": "Research",
      "kind": "list",
      "description": "The student journal.",
      "titleField": "label",
      "sortable": true,
      "tags": [
        "journals",
        "student"
      ],
      "legacyModule": "src/data/studentJournal.ts",
      "routes": [
        "/news/media/newspaper"
      ],
      "fields": [
        {
          "name": "year",
          "label": "Year",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "pdf",
          "label": "Pdf",
          "required": true,
          "kind": "image"
        },
        {
          "name": "cover",
          "label": "Cover",
          "required": false,
          "nullable": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "partners",
      "label": "Partner universities",
      "group": "International",
      "kind": "list",
      "titleField": "c",
      "tags": [
        "partners"
      ],
      "legacyModule": "src/data/sources/iro-partners.json",
      "routes": [
        "/international/partners"
      ],
      "fields": [
        {
          "name": "c",
          "label": "C",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "ka",
          "label": "Georgian",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "fl",
          "label": "Fl",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "r",
          "label": "R",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "africa",
              "label": "Africa"
            },
            {
              "value": "asia",
              "label": "Asia"
            },
            {
              "value": "europe",
              "label": "Europe"
            },
            {
              "value": "namerica",
              "label": "Namerica"
            },
            {
              "value": "region",
              "label": "Region"
            },
            {
              "value": "samerica",
              "label": "Samerica"
            }
          ],
          "listColumn": true
        },
        {
          "name": "u",
          "label": "U",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        }
      ]
    },
    {
      "name": "mobilityCalls",
      "label": "Mobility calls",
      "group": "International",
      "kind": "list",
      "description": "Erasmus, bilateral and virtual exchange calls.",
      "titleField": "partner",
      "sortField": "deadline",
      "sortDirection": "asc",
      "tags": [
        "iro",
        "exchange"
      ],
      "legacyModule": "src/data/iroExchange.ts",
      "routes": [
        "/international/exchange"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "kind",
          "label": "Kind",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "bilateral",
              "label": "Bilateral"
            },
            {
              "value": "erasmus",
              "label": "Erasmus"
            },
            {
              "value": "virtual",
              "label": "Virtual"
            }
          ],
          "listColumn": true
        },
        {
          "name": "university",
          "label": "University",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "place",
          "label": "Place",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "places",
          "label": "Places",
          "required": true,
          "kind": "number"
        },
        {
          "name": "term",
          "label": "Term",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "fall",
              "label": "Fall"
            },
            {
              "value": "spring",
              "label": "Spring"
            },
            {
              "value": "year",
              "label": "Year"
            }
          ]
        },
        {
          "name": "schools",
          "label": "Schools",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text"
          }
        },
        {
          "name": "offers",
          "label": "Offers",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "ba",
                  "label": "Ba"
                },
                {
                  "value": "ma",
                  "label": "Ma"
                },
                {
                  "value": "phd",
                  "label": "Phd"
                }
              ]
            },
            {
              "name": "programmes",
              "label": "Programmes",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            }
          ]
        },
        {
          "name": "deadline",
          "label": "Deadline",
          "required": false,
          "nullable": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "href",
          "label": "Link",
          "required": false,
          "nullable": true,
          "kind": "url"
        }
      ]
    },
    {
      "name": "seasonalSchools",
      "label": "Seasonal schools",
      "group": "International",
      "kind": "list",
      "titleField": "title",
      "tags": [
        "iro",
        "exchange"
      ],
      "legacyModule": "src/data/iroExchange.ts",
      "routes": [
        "/international/exchange",
        "/applicants/seasonal-schools"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "host",
          "label": "Host",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "place",
          "label": "Place",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "when",
          "label": "When",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "deadline",
          "label": "Deadline",
          "required": true,
          "kind": "date"
        },
        {
          "name": "cost",
          "label": "Cost",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "includes",
          "label": "Includes",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "textarea"
              }
            },
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "textarea"
              }
            }
          ]
        },
        {
          "name": "href",
          "label": "Link",
          "required": false,
          "nullable": true,
          "kind": "url"
        }
      ]
    },
    {
      "name": "experiences",
      "label": "Student experiences",
      "group": "International",
      "kind": "list",
      "description": "The 120 exchange stories on /international/experiences.",
      "titleField": "name",
      "keyField": "id",
      "tags": [
        "iro"
      ],
      "legacyModule": "src/data/iroExperiences.ts",
      "routes": [
        "/international/experiences"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "kicker",
          "label": "Kicker",
          "required": false,
          "nullable": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "textarea"
              }
            },
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "textarea"
              }
            }
          ]
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": false,
          "nullable": true,
          "kind": "image"
        },
        {
          "name": "w",
          "label": "W",
          "required": false,
          "nullable": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "h",
          "label": "H",
          "required": false,
          "nullable": true,
          "kind": "number"
        },
        {
          "name": "href",
          "label": "Link",
          "required": true,
          "kind": "url"
        }
      ]
    },
    {
      "name": "iroProjects",
      "label": "International projects",
      "group": "International",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "tags": [
        "iro"
      ],
      "legacyModule": "src/data/iroProjects.ts",
      "routes": [
        "/international/projects"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "join",
          "label": "Join",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "before",
              "label": "Before",
              "required": true,
              "kind": "text"
            },
            {
              "name": "after",
              "label": "After",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3,
          "listColumn": true
        },
        {
          "name": "site",
          "label": "Site",
          "required": true,
          "kind": "url"
        },
        {
          "name": "image",
          "label": "Image",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "src",
              "label": "Image",
              "required": true,
              "kind": "image"
            },
            {
              "name": "w",
              "label": "W",
              "required": true,
              "kind": "number"
            },
            {
              "name": "h",
              "label": "H",
              "required": true,
              "kind": "number"
            },
            {
              "name": "alt",
              "label": "Alt",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        },
        {
          "name": "logo",
          "label": "Logo",
          "required": true,
          "kind": "boolean",
          "listColumn": true
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "newsletters",
          "label": "Newsletters",
          "required": false,
          "nullable": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "url"
          }
        },
        {
          "name": "facts",
          "label": "Facts",
          "required": false,
          "nullable": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "value",
              "label": "Value",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        },
        {
          "name": "articles",
          "label": "Articles",
          "required": false,
          "nullable": true,
          "kind": "array",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "text"
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            }
          ]
        }
      ]
    },
    {
      "name": "iroAdmission",
      "label": "International admission",
      "group": "International",
      "kind": "list",
      "titleField": "title",
      "sortable": true,
      "tags": [
        "iro"
      ],
      "legacyModule": "src/data/iroAdmission.ts",
      "routes": [
        "/international/admission"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "blocks",
          "label": "Blocks",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "fields": [
                {
                  "name": "p",
                  "label": "P",
                  "required": false,
                  "nullable": true,
                  "kind": "richtext",
                  "rows": 8
                },
                {
                  "name": "ul",
                  "label": "Ul",
                  "required": false,
                  "nullable": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "richtext"
                  }
                },
                {
                  "name": "lines",
                  "label": "Lines",
                  "required": false,
                  "nullable": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                }
              ]
            },
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "fields": [
                {
                  "name": "p",
                  "label": "P",
                  "required": false,
                  "nullable": true,
                  "kind": "richtext",
                  "rows": 8
                },
                {
                  "name": "ul",
                  "label": "Ul",
                  "required": false,
                  "nullable": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "richtext"
                  }
                },
                {
                  "name": "lines",
                  "label": "Lines",
                  "required": false,
                  "nullable": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "campusPhotos",
      "label": "Campus gallery",
      "group": "International",
      "kind": "list",
      "titleField": "src",
      "sortable": true,
      "tags": [
        "iro",
        "campus"
      ],
      "legacyModule": "src/data/iroCampus.ts",
      "routes": [
        "/international/campus"
      ],
      "fields": [
        {
          "name": "src",
          "label": "Image",
          "required": true,
          "kind": "image",
          "listColumn": true
        },
        {
          "name": "w",
          "label": "W",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "h",
          "label": "H",
          "required": true,
          "kind": "number",
          "listColumn": true
        }
      ]
    },
    {
      "name": "clubs",
      "label": "Student clubs",
      "group": "Student life",
      "kind": "list",
      "titleField": "name",
      "keyField": "id",
      "sortable": true,
      "tags": [
        "clubs"
      ],
      "legacyModule": "src/data/clubs.ts",
      "routes": [
        "/student/life"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "category",
          "label": "Category",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "meets",
          "label": "Meets",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "members",
          "label": "Members",
          "required": true,
          "kind": "number",
          "listColumn": true
        },
        {
          "name": "accent",
          "label": "Accent",
          "required": true,
          "kind": "color"
        },
        {
          "name": "icon",
          "label": "Icon",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "civic",
              "label": "Civic"
            },
            {
              "value": "debate",
              "label": "Debate"
            },
            {
              "value": "drama",
              "label": "Drama"
            },
            {
              "value": "eco",
              "label": "Eco"
            },
            {
              "value": "language",
              "label": "Language"
            },
            {
              "value": "media",
              "label": "Media"
            },
            {
              "value": "tech",
              "label": "Tech"
            },
            {
              "value": "volunteer",
              "label": "Volunteer"
            }
          ]
        }
      ]
    },
    {
      "name": "blogPosts",
      "label": "Student blog",
      "group": "Student life",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "date",
      "sortDirection": "desc",
      "tags": [
        "blog"
      ],
      "legacyModule": "src/data/blog.ts",
      "routes": [
        "/student/blog"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "category",
          "label": "Category",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "career",
              "label": "Career"
            },
            {
              "value": "exchange",
              "label": "Exchange"
            },
            {
              "value": "life",
              "label": "Life"
            },
            {
              "value": "tips",
              "label": "Tips"
            }
          ],
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "author",
          "label": "Author",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "note",
          "label": "Note",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "blogFeatured",
      "label": "Featured blog post",
      "group": "Student life",
      "kind": "singleton",
      "titleField": "title",
      "tags": [
        "blog"
      ],
      "legacyModule": "src/data/blog.ts",
      "routes": [
        "/student/blog"
      ],
      "fields": [
        {
          "name": "tag",
          "label": "Tag",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "excerpt",
          "label": "Excerpt",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "author",
          "label": "Author",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "role",
          "label": "Role",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "img",
          "label": "Image",
          "required": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "studentVacancies",
      "label": "Student jobs",
      "group": "Student life",
      "kind": "list",
      "description": "Internships, part-time work and graduate roles.",
      "titleField": "title",
      "keyField": "id",
      "sortField": "deadline",
      "sortDirection": "asc",
      "tags": [
        "vacancies",
        "career"
      ],
      "legacyModule": "src/data/studentVacancies.ts",
      "routes": [
        "/student/career/vacancies"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "status",
          "label": "Status",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "closed",
              "label": "Closed"
            },
            {
              "value": "open",
              "label": "Open"
            }
          ],
          "listColumn": true
        },
        {
          "name": "field",
          "label": "Field",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "health",
              "label": "Health"
            },
            {
              "value": "it",
              "label": "It"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "media",
              "label": "Media"
            }
          ],
          "listColumn": true
        },
        {
          "name": "kind",
          "label": "Kind",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "graduate",
              "label": "Graduate"
            },
            {
              "value": "internship",
              "label": "Internship"
            },
            {
              "value": "parttime",
              "label": "Parttime"
            }
          ],
          "listColumn": true
        },
        {
          "name": "deadline",
          "label": "Deadline",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "company",
          "label": "Company",
          "required": true,
          "kind": "text"
        },
        {
          "name": "short",
          "label": "Short",
          "required": true,
          "kind": "text"
        },
        {
          "name": "text",
          "label": "Text",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "object",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "type",
                  "label": "Type",
                  "required": true,
                  "kind": "select",
                  "options": [
                    {
                      "value": "Full-time · graduate entry",
                      "label": "Full time · graduate entry"
                    },
                    {
                      "value": "Internship · 16 h / week",
                      "label": "Internship · 16 h / week"
                    },
                    {
                      "value": "Internship · 20 h / week",
                      "label": "Internship · 20 h / week"
                    },
                    {
                      "value": "Internship · 20 h / week · paid",
                      "label": "Internship · 20 h / week · paid"
                    },
                    {
                      "value": "Internship · 24 h / week · paid",
                      "label": "Internship · 24 h / week · paid"
                    },
                    {
                      "value": "Part-time · 16 h / week",
                      "label": "Part time · 16 h / week"
                    },
                    {
                      "value": "Part-time · 20 h / week",
                      "label": "Part time · 20 h / week"
                    },
                    {
                      "value": "Part-time · shifts · paid",
                      "label": "Part time · shifts · paid"
                    },
                    {
                      "value": "Volunteer · 8 h / week",
                      "label": "Volunteer · 8 h / week"
                    }
                  ]
                },
                {
                  "name": "location",
                  "label": "Location",
                  "required": true,
                  "kind": "select",
                  "options": [
                    {
                      "value": "Tbilisi · hybrid",
                      "label": "Tbilisi · hybrid"
                    },
                    {
                      "value": "Tbilisi · on site",
                      "label": "Tbilisi · on site"
                    },
                    {
                      "value": "Tbilisi · remote-friendly",
                      "label": "Tbilisi · remote friendly"
                    }
                  ]
                },
                {
                  "name": "summary",
                  "label": "Summary",
                  "required": true,
                  "kind": "textarea",
                  "rows": 3
                },
                {
                  "name": "requirements",
                  "label": "Requirements",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                },
                {
                  "name": "offer",
                  "label": "Offer",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                }
              ]
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "object",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "type",
                  "label": "Type",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "location",
                  "label": "Location",
                  "required": true,
                  "kind": "select",
                  "options": [
                    {
                      "value": "თბილისი · ადგილზე",
                      "label": "Თბილისი · ადგილზე"
                    },
                    {
                      "value": "თბილისი · შესაძლებელია დისტანციურად",
                      "label": "Თბილისი · შესაძლებელია დისტანციურად"
                    },
                    {
                      "value": "თბილისი · ჰიბრიდული",
                      "label": "Თბილისი · ჰიბრიდული"
                    }
                  ]
                },
                {
                  "name": "summary",
                  "label": "Summary",
                  "required": true,
                  "kind": "textarea",
                  "rows": 3
                },
                {
                  "name": "requirements",
                  "label": "Requirements",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                },
                {
                  "name": "offer",
                  "label": "Offer",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "careerLinks",
      "label": "Career resources",
      "group": "Student life",
      "kind": "list",
      "titleField": "title",
      "sortable": true,
      "tags": [
        "career"
      ],
      "legacyModule": "src/data/careerLinks.ts",
      "routes": [
        "/student/career"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "links",
          "label": "Links",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            }
          ]
        }
      ]
    },
    {
      "name": "quizQuestions",
      "label": "Profession quiz questions",
      "group": "Student life",
      "kind": "list",
      "titleField": "text",
      "sortable": true,
      "tags": [
        "quiz"
      ],
      "legacyModule": "src/data/sources/quiz.json",
      "routes": [
        "/applicants/quiz"
      ],
      "fields": [
        {
          "name": "a",
          "label": "A",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "business",
              "label": "Business"
            },
            {
              "value": "cs",
              "label": "Cs"
            },
            {
              "value": "eduhum",
              "label": "Eduhum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "medicine",
              "label": "Medicine"
            }
          ],
          "listColumn": true
        },
        {
          "name": "en",
          "label": "English",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "ge",
          "label": "Georgian",
          "required": true,
          "kind": "text",
          "listColumn": true
        }
      ]
    },
    {
      "name": "quizSchools",
      "label": "Profession quiz results",
      "group": "Student life",
      "kind": "list",
      "titleField": "name",
      "keyField": "key",
      "tags": [
        "quiz"
      ],
      "legacyModule": "src/data/sources/quiz.json",
      "routes": [
        "/applicants/quiz/result"
      ],
      "fields": [
        {
          "name": "key",
          "label": "Key",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "accent",
          "label": "Accent",
          "required": true,
          "kind": "color"
        },
        {
          "name": "page",
          "label": "Page",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "listColumn": true
        },
        {
          "name": "tag",
          "label": "Tag",
          "required": true,
          "kind": "text",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "listColumn": true
        },
        {
          "name": "desc",
          "label": "Desc",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "localeKeys": {
            "ka": "ge",
            "en": "en"
          },
          "rows": 3
        },
        {
          "name": "programs",
          "label": "Programs",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true,
            "localeKeys": {
              "ka": "ge",
              "en": "en"
            }
          }
        }
      ]
    },
    {
      "name": "quizCatalogueMatch",
      "label": "Quiz to catalogue mapping",
      "group": "Student life",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "quiz"
      ],
      "legacyModule": "src/data/quiz.ts",
      "fields": [
        {
          "name": "Business Administration",
          "label": "Business administration",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Finance",
          "label": "Finance",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Economics",
          "label": "Economics",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Marketing",
          "label": "Marketing",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Law (LLB)",
          "label": "Law (llb)",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Computer Science",
          "label": "Computer science",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Architecture",
          "label": "Architecture",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Psychology",
          "label": "Psychology",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Journalism",
          "label": "Journalism",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "English Philology",
          "label": "English philology",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "International Relations",
          "label": "International relations",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        },
        {
          "name": "Medicine (MD)",
          "label": "Medicine (md)",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "level",
              "label": "Level",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text"
            }
          ]
        }
      ]
    },
    {
      "name": "masterclasses",
      "label": "Masterclasses",
      "group": "Applicants",
      "kind": "list",
      "titleField": "title",
      "sortField": "date",
      "sortDirection": "asc",
      "tags": [
        "applicants"
      ],
      "legacyModule": "src/data/masterclasses.ts",
      "routes": [
        "/applicants/meet-the-lecturers"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "date",
          "label": "Date",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "field",
          "label": "Field",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "by",
          "label": "By",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        }
      ]
    },
    {
      "name": "lecturers",
      "label": "Lecturers",
      "group": "Applicants",
      "kind": "list",
      "titleField": "name",
      "tags": [
        "applicants"
      ],
      "legacyModule": "src/data/masterclasses.ts",
      "routes": [
        "/applicants/meet-the-lecturers"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "group",
          "label": "Group",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "biz",
              "label": "Biz"
            },
            {
              "value": "hum",
              "label": "Hum"
            },
            {
              "value": "law",
              "label": "Law"
            },
            {
              "value": "tech",
              "label": "Tech"
            }
          ],
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "field",
          "label": "Field",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "bio",
          "label": "Bio",
          "required": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "trainings",
      "label": "Academy trainings",
      "group": "Applicants",
      "kind": "list",
      "description": "Each training's own page: facts, trainers, topics, price and how to register.",
      "titleField": "title",
      "keyField": "slug",
      "tags": [
        "academy"
      ],
      "legacyModule": "src/data/academy.ts",
      "routes": [
        "/applicants/trainings",
        "/applicants/trainings/[slug]"
      ],
      "fields": [
        {
          "name": "slug",
          "label": "Slug",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "year",
          "label": "Year",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "2025",
              "label": "2025"
            },
            {
              "value": "2026",
              "label": "2026"
            }
          ],
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "heading",
          "label": "Heading",
          "required": false,
          "nullable": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "lede",
          "label": "Lede",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "facts",
          "label": "Facts",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "value",
              "label": "Value",
              "required": true,
              "kind": "text",
              "localized": true
            }
          ]
        },
        {
          "name": "trainers",
          "label": "Trainers",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "role",
              "label": "Role",
              "required": true,
              "kind": "textarea",
              "localized": true,
              "rows": 3
            }
          ]
        },
        {
          "name": "topics",
          "label": "Topics",
          "required": false,
          "nullable": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "price",
          "label": "Price",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "notes",
          "label": "Notes",
          "required": true,
          "kind": "array",
          "of": {
            "name": "item",
            "label": "Item",
            "kind": "text",
            "localized": true
          }
        },
        {
          "name": "register",
          "label": "Register",
          "required": true,
          "kind": "url"
        },
        {
          "name": "weeks",
          "label": "Weeks",
          "required": false,
          "nullable": true,
          "kind": "array",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "items",
              "label": "Items",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text",
                "localized": true
              }
            }
          ]
        }
      ]
    },
    {
      "name": "academyContact",
      "label": "Academy contact and bank details",
      "group": "Applicants",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "academy"
      ],
      "legacyModule": "src/data/academy.ts",
      "fields": [
        {
          "name": "ACADEMY_EMAIL",
          "label": "Academy email",
          "required": true,
          "kind": "email"
        },
        {
          "name": "ACADEMY_TEL",
          "label": "Academy Telephone",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "ACADEMY_BANK",
          "label": "Academy bank",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "bank",
              "label": "Bank",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "code",
              "label": "Code",
              "required": true,
              "kind": "text"
            },
            {
              "name": "name",
              "label": "Name",
              "required": true,
              "kind": "text",
              "localized": true
            },
            {
              "name": "account",
              "label": "Account",
              "required": true,
              "kind": "text"
            }
          ]
        }
      ]
    },
    {
      "name": "departments",
      "label": "Departments",
      "group": "University",
      "kind": "list",
      "description": "The contact directory on /contact.",
      "titleField": "name",
      "keyField": "id",
      "sortable": true,
      "tags": [
        "departments",
        "contact"
      ],
      "legacyModule": "src/data/departments.ts",
      "routes": [
        "/contact"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "category",
          "label": "Category",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "admin",
              "label": "Admin"
            },
            {
              "value": "centers",
              "label": "Centers"
            },
            {
              "value": "schools",
              "label": "Schools"
            },
            {
              "value": "students",
              "label": "Students"
            }
          ],
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "ext",
          "label": "Ext",
          "required": false,
          "nullable": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "email",
          "label": "Email",
          "required": false,
          "nullable": true,
          "kind": "email"
        },
        {
          "name": "tel",
          "label": "Telephone",
          "required": false,
          "nullable": true,
          "kind": "tel"
        },
        {
          "name": "site",
          "label": "Site",
          "required": false,
          "nullable": true,
          "kind": "object",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text"
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            }
          ]
        },
        {
          "name": "page",
          "label": "Page",
          "required": false,
          "nullable": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "room",
          "label": "Room",
          "required": false,
          "nullable": true,
          "kind": "text"
        }
      ]
    },
    {
      "name": "qualityTeam",
      "label": "Quality assurance team",
      "group": "University",
      "kind": "list",
      "titleField": "name",
      "sortable": true,
      "tags": [
        "about"
      ],
      "legacyModule": "src/data/qualityTeam.ts",
      "routes": [
        "/about/quality"
      ],
      "fields": [
        {
          "name": "role",
          "label": "Role",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "image",
          "label": "Image",
          "required": true,
          "kind": "image"
        }
      ]
    },
    {
      "name": "documentation",
      "label": "Documents",
      "group": "University",
      "kind": "list",
      "description": "The regulations and plans on /about/documentation. Each language has its own list — the Georgian one is shorter than the English one, so these are not translations of each other.",
      "titleField": "heading",
      "sortable": true,
      "tags": [
        "documentation"
      ],
      "legacyModule": "src/data/documentation.ts",
      "routes": [
        "/about/documentation",
        "/international/documentation"
      ],
      "fields": [
        {
          "name": "locale",
          "label": "Locale",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "en",
              "label": "English"
            },
            {
              "value": "ka",
              "label": "Georgian"
            }
          ],
          "listColumn": true
        },
        {
          "name": "heading",
          "label": "Heading",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "docs",
          "label": "Docs",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "title",
              "label": "Title",
              "required": true,
              "kind": "text"
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            },
            {
              "name": "format",
              "label": "Format",
              "required": true,
              "kind": "select",
              "options": [
                {
                  "value": "DOCX",
                  "label": "Docx"
                },
                {
                  "value": "PDF",
                  "label": "Pdf"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "vacancies",
      "label": "Vacancies",
      "group": "University",
      "kind": "list",
      "titleField": "title",
      "keyField": "id",
      "sortField": "deadline",
      "sortDirection": "asc",
      "tags": [
        "vacancies"
      ],
      "legacyModule": "src/data/vacancies.ts",
      "routes": [
        "/vacancies"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "status",
          "label": "Status",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "closed",
              "label": "Closed"
            },
            {
              "value": "open",
              "label": "Open"
            }
          ],
          "listColumn": true
        },
        {
          "name": "category",
          "label": "Category",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "academic",
              "label": "Academic"
            },
            {
              "value": "admin",
              "label": "Admin"
            },
            {
              "value": "intern",
              "label": "Intern"
            }
          ],
          "listColumn": true
        },
        {
          "name": "deadline",
          "label": "Deadline",
          "required": true,
          "kind": "date",
          "listColumn": true
        },
        {
          "name": "text",
          "label": "Text",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "object",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "categoryLabel",
                  "label": "Category label",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "unit",
                  "label": "Unit",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "type",
                  "label": "Type",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "summary",
                  "label": "Summary",
                  "required": true,
                  "kind": "textarea",
                  "rows": 3
                },
                {
                  "name": "requirements",
                  "label": "Requirements",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                },
                {
                  "name": "documents",
                  "label": "Documents",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                }
              ]
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "object",
              "fields": [
                {
                  "name": "title",
                  "label": "Title",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "categoryLabel",
                  "label": "Category label",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "unit",
                  "label": "Unit",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "type",
                  "label": "Type",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "summary",
                  "label": "Summary",
                  "required": true,
                  "kind": "textarea",
                  "rows": 3
                },
                {
                  "name": "requirements",
                  "label": "Requirements",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                },
                {
                  "name": "documents",
                  "label": "Documents",
                  "required": true,
                  "kind": "array",
                  "of": {
                    "name": "item",
                    "label": "Item",
                    "kind": "text"
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "careerContact",
      "label": "Career centre contact",
      "group": "Student life",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "career",
        "vacancies"
      ],
      "legacyModule": "src/data/studentVacancies.ts",
      "routes": [
        "/student/career",
        "/student/vacancies"
      ],
      "fields": [
        {
          "name": "CAREER_EMAIL",
          "label": "Career email",
          "required": true,
          "kind": "email"
        }
      ]
    },
    {
      "name": "hrContact",
      "label": "HR contact",
      "group": "University",
      "kind": "singleton",
      "titleField": "id",
      "tags": [
        "vacancies"
      ],
      "legacyModule": "src/data/vacancies.ts",
      "fields": [
        {
          "name": "HR_EMAIL",
          "label": "Hr email",
          "required": true,
          "kind": "email"
        },
        {
          "name": "HR_PHONE",
          "label": "Hr phone",
          "required": true,
          "kind": "text",
          "listColumn": true
        }
      ]
    },
    {
      "name": "libraryLinks",
      "label": "Library links",
      "group": "University",
      "kind": "list",
      "description": "Each language has its own list.",
      "titleField": "title",
      "sortable": true,
      "tags": [
        "library"
      ],
      "legacyModule": "src/data/libraryLinks.ts",
      "routes": [
        "/library"
      ],
      "fields": [
        {
          "name": "locale",
          "label": "Locale",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "en",
              "label": "English"
            },
            {
              "value": "ka",
              "label": "Georgian"
            }
          ],
          "listColumn": true
        },
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "select",
          "options": [
            {
              "value": "dictionaries",
              "label": "Dictionaries"
            },
            {
              "value": "libraries",
              "label": "Libraries"
            }
          ],
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "links",
          "label": "Links",
          "required": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text"
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            }
          ]
        }
      ]
    },
    {
      "name": "libraryFeaturedDatabase",
      "label": "Featured library database",
      "group": "University",
      "kind": "singleton",
      "description": "EBSCO, the platform the scientific-bases page leads with, set apart from the list below it.",
      "titleField": "name",
      "tags": [
        "library"
      ],
      "legacyModule": "src/data/libraryDatabases.ts",
      "routes": [
        "/library/scientific-bases"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "href",
          "label": "Link",
          "required": true,
          "kind": "url"
        },
        {
          "name": "logo",
          "label": "Logo",
          "required": true,
          "kind": "image"
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "richtext",
          "localized": true,
          "rows": 8
        }
      ]
    },
    {
      "name": "exchangeProgrammeNames",
      "label": "Exchange programme names",
      "group": "International",
      "kind": "singleton",
      "description": "The subjects a mobility call offers, named in both languages. A call's rows point at these keys.",
      "titleField": "id",
      "tags": [
        "iro",
        "exchange"
      ],
      "legacyModule": "src/data/iroExchange.ts",
      "routes": [
        "/international/exchange"
      ],
      "fields": [
        {
          "name": "management",
          "label": "Management",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "marketing",
          "label": "Marketing",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "economics",
          "label": "Economics",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "finance",
          "label": "Finance",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "accounting",
          "label": "Accounting",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "business",
          "label": "Business",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "businessAdmin",
          "label": "Business admin",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "tourism",
          "label": "Tourism",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "hospitality",
          "label": "Hospitality",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "computerScience",
          "label": "Computer science",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "architecture",
          "label": "Architecture",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "englishPhilology",
          "label": "English philology",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "teacherTraining",
          "label": "Teacher training",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "americanStudies",
          "label": "American studies",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "psychology",
          "label": "Psychology",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "internationalRelations",
          "label": "International relations",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "law",
          "label": "Law",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "journalism",
          "label": "Journalism",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "medicine",
          "label": "Medicine",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "publicAdmin",
          "label": "Public admin",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "eduAdmin",
          "label": "Edu admin",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "eduLeadership",
          "label": "Edu leadership",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "cognitiveSystems",
          "label": "Cognitive systems",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "riskManagement",
          "label": "Risk management",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "globalBusiness",
          "label": "Global business",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "intlBusinessDev",
          "label": "Intl business dev",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "criminalLaw",
          "label": "Criminal law",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "privateLaw",
          "label": "Private law",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "publicLaw",
          "label": "Public law",
          "required": true,
          "kind": "text",
          "localized": true
        },
        {
          "name": "comparativeLaw",
          "label": "Comparative law",
          "required": true,
          "kind": "text",
          "localized": true
        }
      ]
    },
    {
      "name": "libraryDatabases",
      "label": "Library databases",
      "group": "University",
      "kind": "list",
      "titleField": "name",
      "sortable": true,
      "tags": [
        "library"
      ],
      "legacyModule": "src/data/libraryDatabases.ts",
      "routes": [
        "/library/scientific-bases"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "name",
          "label": "Name",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "href",
          "label": "Link",
          "required": true,
          "kind": "url"
        },
        {
          "name": "logo",
          "label": "Logo",
          "required": true,
          "kind": "image"
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "richtext",
          "localized": true,
          "rows": 8
        },
        {
          "name": "collections",
          "label": "Collections",
          "required": false,
          "nullable": true,
          "kind": "array",
          "fields": [
            {
              "name": "label",
              "label": "Label",
              "required": true,
              "kind": "text"
            },
            {
              "name": "href",
              "label": "Link",
              "required": true,
              "kind": "url"
            }
          ]
        }
      ]
    },
    {
      "name": "tecProjects",
      "label": "TEC projects",
      "group": "University",
      "kind": "list",
      "titleField": "title",
      "sortable": true,
      "tags": [
        "tec"
      ],
      "legacyModule": "src/data/tecProjects.ts",
      "routes": [
        "/tec"
      ],
      "fields": [
        {
          "name": "id",
          "label": "ID",
          "required": true,
          "kind": "text",
          "listColumn": true
        },
        {
          "name": "image",
          "label": "Image",
          "required": true,
          "kind": "image"
        },
        {
          "name": "kind",
          "label": "Kind",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "title",
          "label": "Title",
          "required": true,
          "kind": "text",
          "localized": true,
          "listColumn": true
        },
        {
          "name": "body",
          "label": "Body",
          "required": true,
          "kind": "textarea",
          "localized": true,
          "rows": 3
        },
        {
          "name": "tags",
          "label": "Tags",
          "required": true,
          "kind": "object",
          "fields": [
            {
              "name": "en",
              "label": "English",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            },
            {
              "name": "ka",
              "label": "Georgian",
              "required": true,
              "kind": "array",
              "of": {
                "name": "item",
                "label": "Item",
                "kind": "text"
              }
            }
          ]
        }
      ]
    }
  ];
