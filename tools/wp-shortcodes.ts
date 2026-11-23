/**
 * WPBakery page markup, turned into the HTML the editor here stores.
 *
 * The old site's pages are not written in HTML. They are written in the page
 * builder's shortcodes, and `content.rendered` hands them over raw — a page
 * body arrives looking like
 *
 *     <div class="wpb-content-wrapper"><p>[vc_row][vc_column][vc_column_text]</p>
 *     <p>real prose at last</p>
 *     <p>[/vc_column_text][/vc_column][/vc_row]</p></div>
 *
 * Stripping the brackets is the obvious move and it is wrong, because four of
 * these shortcodes are not layout — they *are* the content, held in their
 * attributes where no tag stripper will ever look:
 *
 *     vc_custom_heading   84 headings, the text in `text=`
 *     vc_tab             298 tabs, the label in `title=`
 *     vc_single_image     51 photographs, the file in `image=` as an id
 *     vc_video            15 films, the URL in `link=`
 *
 * So each is given an HTML equivalent and the rest are unwrapped. Tabs
 * become headings: there is no tab strip here, and a labelled section that
 * reads top to bottom keeps every word with the heading it belonged under.
 *
 * The subtlety that costs an afternoon is the quotes. WordPress runs
 * `wptexturize` over the post before the REST API renders it, which turns the
 * straight quotes *inside the shortcode attributes* into typographic ones —
 * `text=&#8221;Courses&#8221;` — so an attribute pattern written against `"`
 * matches not one shortcode on the entire site. They are put back before
 * anything is parsed.
 */

/** `&#8221;` and its family, back to the `"` the attribute was written with. */
function straighten(shortcode: string): string {
  return shortcode.replace(/&#82(?:16|17|20|21|42|43);|&[lr][sd]quo;|&Prime;|&prime;/g, '"');
}

/** One attribute out of a shortcode's opening tag. */
function attr(shortcode: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(shortcode);
  return m ? m[1].trim() : null;
}

/** `tag:h4|text_align:left` -> `h4`, the heading level the page asked for. */
function headingTag(fontContainer: string | null): string {
  const m = /tag:(h[1-6])/.exec(fontContainer ?? "");
  return m ? m[1] : "h3";
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface ConvertOptions {
  /**
   * A WordPress attachment id to the URL we serve that file at.
   *
   * The image shortcodes name their picture by id and nothing else, so
   * without this an image is simply lost. Returning `null` means the
   * library has no row for it, and the shortcode is reported rather than
   * replaced with a broken `<img>`.
   */
  imageUrl?: (id: number) => string | null;
}

export interface ConvertResult {
  html: string;
  /** shortcodes that carried content we could not place, for the report */
  dropped: string[];
}

/**
 * Every shortcode whose content lives in its attributes. Anything matched
 * here is replaced; every other `vc_*` is unwrapped, and a shortcode that is
 * not WPBakery's at all is left where it stands — `[first_name]` on the
 * vacancy template is a placeholder the page means to show.
 */
export function fromWpBakery(input: string, options: ConvertOptions = {}): ConvertResult {
  const dropped: string[] = [];
  if (!input) return { html: "", dropped };

  let html = input;

  // The builder's own wrapper, which only ever held the shortcodes.
  html = html.replace(/<div class="wpb-content-wrapper">/g, "").replace(/<\/div>\s*$/, "");

  // Scripts the builder embedded; the markup around them is not content.
  html = html.replace(/\[vc_raw_js\][\s\S]*?\[\/vc_raw_js\]/g, () => {
    dropped.push("vc_raw_js");
    return "";
  });

  const img = (id: number, extra = ""): string => {
    const url = options.imageUrl?.(id) ?? null;
    if (!url) {
      dropped.push(`image ${id}`);
      return "";
    }
    return `<p><img src="${escapeAttr(url)}" alt=""${extra} /></p>`;
  };

  html = html.replace(/\[([a-zA-Z0-9_]+)([^\]]*)\]/g, (match, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    const tag = straighten(`[${rawName}${rawAttrs}]`);

    if (name === "vc_custom_heading") {
      const text = attr(tag, "text");
      if (!text) return "";
      const level = headingTag(attr(tag, "font_container"));
      return `<${level}>${text}</${level}>`;
    }

    if (name === "vc_tab" || name === "vc_nested_tab") {
      const title = attr(tag, "title");
      return title ? `<h4>${title}</h4>` : "";
    }

    if (name === "vc_single_image") {
      const id = Number(attr(tag, "image"));
      return Number.isFinite(id) && id > 0 ? img(id) : "";
    }

    if (name === "vc_images_carousel" || name === "vc_gallery") {
      const ids = (attr(tag, "images") ?? "")
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isFinite(id) && id > 0);
      return ids.map((id) => img(id)).join("");
    }

    if (name === "vc_video") {
      const link = attr(tag, "link");
      if (!link) return "";
      return `<p><a href="${escapeAttr(link)}" target="_blank" rel="noreferrer">${link}</a></p>`;
    }

    // Layout, and the closing half of everything above: unwrap it.
    if (name.startsWith("vc_")) return "";

    // Not the page builder's. Leave it alone.
    return match;
  });

  // `[/vc_column_text]` and its like — a closing tag the pass above did not
  // see, because the name there cannot begin with a slash.
  html = html.replace(/\[\/vc_[a-zA-Z0-9_]*\]/g, "");

  /*
   * What the substitutions left behind.
   *
   * WordPress wrapped each line of shortcodes in a `<p>`, so a line that held
   * nothing else is now an empty paragraph, and a line that held a heading is
   * now `<p><h4>…</h4></p>` — which a browser silently rewrites into an empty
   * paragraph *beside* the heading. Both are tidied here rather than left for
   * the editor to find.
   */
  html = html
    .replace(/<p>\s*(<h[1-6]>[\s\S]*?<\/h[1-6]>)\s*<\/p>/g, "$1")
    .replace(/<p>\s*(<p>[\s\S]*?<\/p>)\s*<\/p>/g, "$1")
    .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, dropped };
}

export interface CleanResult extends ConvertResult {
  /** forms taken out of the body, by the plugin that rendered them */
  forms: string[];
}

/**
 * A page body as the old site hands it over, cleaned down to its content.
 *
 * `content.rendered` is not the page an editor wrote. It is that page after
 * every `the_content` filter on the site has had its turn, and three of them
 * put things in a body that are not the body's:
 *
 *   - a breadcrumb trail (348 of the 358 pages), repeating the path the page
 *     is already at, with a JSON-LD `<script>` under it;
 *   - the page builder's own stylesheet, inline, per page (176);
 *   - a Fluent Forms or Contact Form 7 form, rendered in full (29) — a
 *     `<form>` that posts to WordPress and would be dead markup here.
 *
 * The forms are reported rather than silently dropped, because the form
 * definitions are the one part of the old wp-admin this migration does not
 * carry over: they live behind a login the public API will not give up.
 *
 * The builder is also used two ways across the site and both are handled:
 * 83 pages store shortcodes, 289 store the HTML it generates, 15 hold some
 * of each. The generated form is nothing but nested layout `<div>`s, so
 * after the shortcodes are converted every `<div>` is unwrapped, leaving the
 * paragraphs, headings, lists, tables and images that are the actual page.
 */
export function cleanPageHtml(input: string, options: ConvertOptions = {}): CleanResult {
  const forms: string[] = [];
  if (!input) return { html: "", dropped: [], forms };

  // Carriage returns first, or every whitespace pattern below is working
  // against `\r\n` and quietly matching half of what it should.
  let html = input.replace(/\r\n?/g, "\n");

  // Not content, at any price: the one that carries a JSON-LD blob goes first
  // so the breadcrumb pattern below is not left half a match to chew on.
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    // The plugins label their own output — `<!-- Flexy Breadcrumb -->` sits
    // outside the `<nav>` it introduces, and would outlive it.
    .replace(/<!--[\s\S]*?-->/g, "");

  // The breadcrumb plugin's trail, and the heading some themes print above it.
  html = html.replace(/<nav[^>]*class="[^"]*\bfbc\b[^"]*"[\s\S]*?<\/nav>/gi, "");

  html = html.replace(/<form[\s\S]*?<\/form>/gi, (form) => {
    const kind = /fluentform|ff-el-|ff_form/i.test(form)
      ? "Fluent Forms"
      : /wpcf7/i.test(form)
        ? "Contact Form 7"
        : "form";
    forms.push(kind);
    return "";
  });

  const converted = fromWpBakery(html, options);
  html = converted.html;

  // The builder's layout, which is all its `<div>`s ever were.
  html = html.replace(/<\/?div[^>]*>/gi, "\n");

  html = html
    .replace(/<p>\s*(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)\s*<\/p>/g, "$1")
    .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "")
    .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, "<br />\n")
    /*
     * Unwrapping the layout leaves its shape behind as whitespace: every
     * `</div><div>` is now two newlines with the source's indentation
     * between them, so a page nested eight deep ends up with a screenful
     * of blank lines. A run of whitespace holding two or more newlines
     * becomes one blank line.
     */
    .replace(/[ \t]*\n(?:[ \t]*\n)+[ \t]*/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { html, dropped: converted.dropped, forms };
}
