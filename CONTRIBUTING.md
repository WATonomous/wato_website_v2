# Contributing

`main` deploys straight to production on Vercel, so every change goes through a pull request.

## Branches

- Branch from the latest `main`:

  ```sh
  git checkout main
  git pull
  git checkout -b update-sponsor-logos
  ```

- Use a descriptive branch name that says what the change is, e.g. `update-sponsor-logos` or `fix-blog-images`.
- Keep each PR to one topic. Unrelated fixes go in their own PR.

## Before opening a PR

Run these and make sure all three pass:

```sh
npx tsc --noEmit
npm run lint
npm run build
```

## PR description

- **What** changed and why
- **Files** you touched
- **Testing**: what you ran and what you checked
- Screenshots for any visual change
- If your PR is stacked on another PR, say so at the top and name the PR that has to merge first, like [#93](https://github.com/WATonomous/wato_website_v2/pull/93) does.

## Review and merge

- CI must be green.
- At least one approving review is required.
- Don't merge your own PR. A lead merges it.
- For visual changes, open the Vercel preview link on the PR and check the pages you changed.

## Keep diffs focused

Don't run `npm run pretty` on the whole repo or `npm audit fix` in a feature PR. Both create huge, unrelated diffs.

## Secrets

Never commit `.env` files, keys or other secrets. See [Environment Variables](README.md#environment-variables) for how to get them.
