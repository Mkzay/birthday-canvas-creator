## 2024-05-18 - Path Traversal bypass with startsWith
**Vulnerability:** Path Traversal vulnerability found in `removeFileByUrl` (`server/uploads.ts`) where `filePath.startsWith(uploadsRoot)` was used to validate paths.
**Learning:** `startsWith` on a directory path string can be bypassed by supplying a file in a sibling directory that shares the same prefix (e.g. `/uploads` and `/uploads_bypass`).
**Prevention:** Always append the directory separator `path.sep` to the path when checking `startsWith` to ensure the target is truly inside the expected directory, e.g. `!filePath.startsWith(uploadsRoot + path.sep)`.

## 2024-03-18 - [XSS in Open Graph HTML Generation]
**Vulnerability:** Incomplete HTML escaping for user-provided data (recipient names, page titles, descriptions) when generating OG tags and SVGs.
**Learning:** Manual `.replace()` chains for `&`, `"`, and `<` are insufficient to prevent XSS if `>` and `'` are not also escaped.
**Prevention:** Use a centralized, robust `escapeHtml` utility function that escapes `&`, `<`, `>`, `"`, and `'` for all user-provided data used in HTML/SVG templates.
