<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store content (texts, colors, media, products, categories) lives in Lovable Cloud tables and is edited from /admin; src/lib/site.ts holds defaults and the "asset:" resolver so the page still renders before data loads.
- Uploaded media goes to a private "media" bucket with 20-year signed links, because public buckets are blocked in this workspace.
