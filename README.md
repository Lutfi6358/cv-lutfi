# hotohhilal.com

Personal academic site for Ahmad Lutfi Afifi bin Mohd Nasir. Three static pages sharing one
stylesheet, one script and one set of images. No build step and no dependencies: edit a file,
commit, and GitHub Pages serves it.

## Folder layout

```
index.html              Front page
publications.html       Full publication list with the year filter
projects.html           The eight registered systems in detail
style.css               THE stylesheet. Every page links to this one file.
script.js               Nav, mobile menu, scroll reveal, publication filter
assets/
  portrait.webp         Hero portrait, 800 x 800
  favicon.svg           Tab icon
  sky-hero.svg          Hero band background
  sky-teaching.svg      Teaching band, and the Projects page header
  sky-outreach.svg      Outreach band
  sky-constellation.svg Recognition band, and the Publications page header
  sky-contact.svg       Contact band
  research-1..4.svg     The four research card illustrations
Ahmad_Lutfi_Afifi_CV.pdf
CNAME                   Tells GitHub Pages to serve the site at hotohhilal.com
.nojekyll               Stops GitHub from running Jekyll over the files
robots.txt, sitemap.xml
```

## Publishing on GitHub Pages

1. Create a repository and push everything in this folder to the default branch.
2. In the repository, open Settings, then Pages, and set the source to that branch, folder `/ (root)`.
3. In Settings, Pages, Custom domain, enter `hotohhilal.com`. The `CNAME` file already has it, so
   this should be filled in automatically once the first deploy finishes.
4. At your domain registrar, point `hotohhilal.com` at GitHub with four A records
   (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and a CNAME record for
   `www` pointing at `<your-username>.github.io`.
5. Tick "Enforce HTTPS" once the certificate has been issued, usually within an hour.

## Making changes

**Colours, spacing, fonts.** All in `style.css`, section 1, as CSS variables. Changing
`--accent` changes every eyebrow label, link and primary button on all three pages at once.
The palette is dark throughout: `--bg` is the page, `--bg-alt` the alternating sections,
`--surface` the cards, tables and sidebars, and the five sky bands sit on top of those. Text
runs `--ink` for headings, `--ink-2` for body copy and `--muted` for captions. Every pairing
in that set clears the WCAG AA contrast threshold of 4.5 to 1, so keep that in mind if you
lighten a background or darken a text colour.

**Glossary terms in the Short Bio.** A term is marked up like this:

```html
<span class="gl" tabindex="0">hilal<span class="gl-def"><b>hilal</b>The definition.</span></span>
```

The definition is a real element, not a CSS tooltip, so screen readers and search engines both
read it. It opens centred above the term on a desktop, and docks to the bottom of the screen on
a phone. If a term sits near the left or right edge of the column and its panel would run off
the page, add `gl-start` or `gl-end` to the outer span, as `isbat` does.

**Reading focus.** The `focus-read` class on the bio dims the paragraphs you are not pointing
at. It is switched off on touch devices, where there is no real cursor.

**Adding a page.** Copy `publications.html`, delete everything between `<main id="main">` and
`</main>`, and write the new content. The header, nav, contact block and footer are already in
the file and already match the other pages. Add the page to the nav list in all three existing
files, and to `sitemap.xml`.

**Swapping a drawn sky for a photograph.** Each dark band starts with a line like

```html
<div class="band-bg" style="background-image:url('assets/sky-hero.svg')"></div>
```

Put your photograph in `assets/` and change the filename there. Landscape images around
1600 x 900 or larger work best. The dark overlay that keeps the text readable is the
`band-shade` element on the next line.

**Replacing the portrait.** Overwrite `assets/portrait.webp` with a square image, or change the
`src` in `index.html` to a different filename.

**Showing the real first page of the featured paper.** In `index.html`, find the
`<figure class="paper-page">` block and replace the whole figure with

```html
<img src="assets/cht-first-page.jpg" alt="First page of the Circular Hough Transform paper">
```

**Adding a publication.** In `publications.html`, copy an existing `<li>` inside the right
`<div class="year">` block. The `data-kind` attribute on that block is what the filter buttons
match, so use `journal` or `proc`. Bold your own name with `<strong>` and put the index label in
`<span class="idx">`.

## Notes

The drawn sky scenes are SVG, so they stay sharp at any size and the whole site is under 800 KB.
Fonts come from Google Fonts; everything else is served from this folder.
