# The amazing WATonomous website for amazing people

- [The amazing WATonomous website for amazing people](#the-amazing-watonomous-website-for-amazing-people)
  - [How-Tos](#how-tos)
    - [Creating a Job Posting](#creating-a-job-posting)
    - [Creating a Blog Post](#creating-a-blog-post)
    - [Using Images in Markdown](#using-images-in-markdown)
    - [Adding New Members to the Member List](#adding-new-members-to-the-member-list)
  - [For developers](#for-developers)
    - [Setup](#setup)
    - [Architecture](#architecture)
    - [Environment Variables](#environment-variables)

WATonomous is proving that students can change the world of autonomous vehicles. If you are not a developer and would just like to add content to the site, feel free to skip the "For Developers" sections.

Before opening a pull request, read [CONTRIBUTING.md](CONTRIBUTING.md).

## How-Tos

### Creating a Job Posting

Job postings are simply markdown files in the `/static/job_postings` folder. Add a markdown file there and it'll automatically appear when the website is rebuilt.

The start of the file must include a metadata header. This will be a list fenced by three hyphens `---`.

Within the block a list with the following parameters **must be included**:

- **Title:** Job title, e.g. "Graphic Designer"

- **Team:** Main team name, e.g. "BizOps"

- **Subteam:** Subteam within main team, e.g. "Website"

- **Location:** Most likely either "Waterloo, ON", or "Remote"

- **Type:** Full Time, Part Time, Contract, etc.

Below is an example of a valid header.

```js
---
title: "Full Stack Developer"
team: "BizOps"
subteam: "Website"
location: "Waterloo, ON"
type: "Full Time"
---
```

After this header block, add all content you would like the applicant to see when they click on the posting. A description of WATonomous, responsibilities, key qualifications, etc.

Most common markdown syntax is supported, refer to the [documentation](https://www.markdownguide.org/basic-syntax/).

### Creating a Blog Post

Similar to a Job Posting, create a blog post by putting a markdown file in the `/static/blogs` folder.

The file name becomes the post's URL: `static/blogs/my-first-post.md` is published at `/blogs/my-first-post`. Use lowercase words separated by hyphens, and only put `.md` files in this folder (any other file, even a hidden one like `.DS_Store`, breaks the build).

Blog metadata is a little more involved. The following headers **must be present**, or the build fails and the site won't deploy:

- **title:** The name of the blog post
- **date:** The date the post was published, *please* have it in the format `MMMM DD YYYY` and **always wrap it in quotes**, e.g. `'March 17 2023'`. An unquoted date like `2023-03-17` breaks the build, and a format like `17/03/2023` builds but puts the post in an unpredictable spot. The date is shown exactly as you type it, and posts are sorted by it, newest first.
- **image:** All posts must have an image associated with them. It's the picture on the post's card and the background of the post's header. This will be the file path relative to the `public` folder, starting with a `/`. e.g. `/imgs/blog-01.png`
- **tags:** A *list* of tags you want associated with the post. Even if there is only one tag, place it in a list.
- **authors:** A *list* of the authors of the post. Even if there is one author, place them in the list. Cards only show the first author; the post's own page lists all of them.

These headers are optional:

- **description:** A short blurb about the post. The user will see this before clicking to view the full thing. The build passes without it, but please include it, or the post's card will have no summary.
- **spotlight:** Not used by the site right now, so `true` and `false` do the same thing. You can leave it out.

The top of `/blogs` is decided only by `date`: the newest post becomes the big header, and the three newest posts appear under **Featured**. Every post appears under **All Blogs**.

Below is an example of a valid header:

```js
---
title: 'Don Quixote'
date: 'March 17 2023'
image: '/imgs/blog-01.png'
description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Nulla porttitor massa id neque aliquam vestibulum. Facilisis mauris sit amet massa vitae tortor.'
tags: ['tag1', 'tag2', 'tag3']
authors: ['Miguel de Cervantes']
spotlight: true
---
```

After this header block, write the post in markdown. Tables and strikethrough (`~~text~~`) aren't supported, and raw HTML is removed. For pictures, see [Using Images in Markdown](#using-images-in-markdown).

To preview your post, run `npm run dev` and open `http://localhost:3000/blogs/<file name without .md>`, e.g. `http://localhost:3000/blogs/my-first-post`. Check `http://localhost:3000/blogs` as well, since a header mistake can break either page. Then run `npm run build` to make sure the site still builds.

### Using Images in Markdown

If you ever need to place an image inside a markdown file, you follow this syntax:

```md
![Alt Text](URL of the Image)
```

**Alt text** is important for accessibility. This is what screen readers will dictate when they come across an image. It is also the text that will display if the actual image itself cannot be displayed. Make this descriptive!

The **URL** can be in one of two formats. If using an image from the internet, simply place the image URL here, e.g.:

```md
![Red Mage Single Target Rotation](https://pbs.twimg.com/media/EktBITsVgAAgwV2.jpg)
```

If you have an image on your computer, first place your image in `public/imgs`. This is where *all* images on the website should be placed.

Then refer to it by its path from the `public` folder, starting with a `/` and **without** `public` in it. Everything in `public` is served from the root of the site, so `public/imgs/team.jpg` lives at `/imgs/team.jpg`. e.g.:

```md
![The WATonomous Team Group Picture](/imgs/team.jpg)
```

> Don't write `public/imgs/team.jpg` or `imgs/team.jpg`. Both build without errors but show a broken image on the site, because the browser looks for them relative to the page (e.g. `/blogs/public/imgs/team.jpg`).

Raw HTML is removed from markdown, so you can't use an `<img>` tag to resize an image. Crop or resize the file itself before adding it.

### Adding New Members to the Member List

This is done in the `./pages/about.tsx` file. At the top of the file is a very large array of `MemberCardProps` objects called `MemberData`. Member order in the array will match that of the page.

To add a new member to the list just add a new `MemebrCardProps` object:

```js
{
    imageSrc: image_src,
    firstName: "Cloud",
    lastName: "Strife",
    description: "Cloud loves his Chocobo",
    position: "Party Leader",
}
```

> **Please note that we don't actually use the description field right now, feel free to leave it a blank string**

`imageSrc` should point to a statically imported image for best performance. Copy the imports at the top of the page. The format will be similar to this:

```js
import image_src from "../public/imgs/headshots/cloud_strife.jpg";
```

To keep things organized, images should be kept in the `headshots` folder.

## For developers

### Setup

This is a Next.js application written in Typescript, deployed with Vercel.

Set up the repo as you would any other node application:

```sh
npm i
npm run dev
```

`npm run build`, `npm run lint`, and `npm run pretty` are self explanatory.

### Architecture

![System Architecture](public/readme/architecture.png)

We use the **GCS** Sheets API to make updates to our job posting sheets.

We use **Postmark** to send emails via the "Connect" modal.

Our anti-abuse system uses Upstash's managed redis.

### Environment Variables

We inject environment variables during our build step on Vercel: [https://vercel.com/watonomous-projects/wato-website-c9jr/settings/environment-variables](https://vercel.com/watonomous-projects/wato-website-c9jr/settings/environment-variables).

> When testing code that requires environment variables to be set (sending job apps, sending emails), please ask an admin with access to the watonomous admin account to give them to you. Note that environment variables are easily exported from vercel using [the cli tool](https://vercel.com/docs/cli/env). Next.js will **automatically** expose variables in `env.*` files (e.g. env.local)

Access them in code using `process.env` just like a normal environment variable.

**UPSTASH_REDIS_REST_TOKEN**: Find this in the upstash console for the redis instance

**UPSTASH_REDIS_REST_URL**: Find this in the upstash console for the redis instance

**EMAIL_SERVER**: The token we use for our mail server

**ROLLING_ID**: The google sheet id for our rolling applications

**EXPEDITED_ID**: The google sheet id for our expedited applications

> The following keys can be found in the google cloud console in the WATO project

**CLIENT_ID**: OAuth 2 Client ID for our service account

**CLIENT_EMAIL**: Service account email

**PRIVATE_KEY**: Service account private key. This was generated when the key was created. Mint a new one in the service accounts page to change.

**PRIVATE_KEY_ID**: Private Key ID of the service account

**PROJECT_ID**: ID of the WATO project

**CAPTCHA_SECRET**: Secret for reCAPTCHA. Generated when he key was created, mint a new one to reset.

**NEXT_PUBLIC_CAPTCHA_SITE_KEY**: Key for the reCAPTCHA secret. See in the cloud console for project `watowebsite` of the `service@watonomous.ca` account
