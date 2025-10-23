Eleventy port of medieval-source-book

This folder contains a minimal Eleventy (11ty) scaffold intended to help port templates from the repository's Jekyll site into an 11ty site.

What is included
- `package.json` with scripts to build Sass and run Eleventy
- `.eleventy.js` minimal config (passthroughs for `assets/` and `html/`)
- `_layouts/` and `_includes/` with minimal templates
- `_data/navigation.json` small navigation example
- `index.md` sample page

How to run

```bash
cd 11ty
npm install
npm start
```

Notes and next steps
- This scaffold compiles Sass from the repo's `_sass/` directory into `11ty/dist/css`. The filenames used in the layout are minimal; you may want to assemble a single compiled CSS file or adapt the styles to 11ty's build pipeline.
- Port additional includes/layouts from `_includes/` and `_layouts/` in the root repo as needed. Data files in `_data/` can be copied or referenced directly.
