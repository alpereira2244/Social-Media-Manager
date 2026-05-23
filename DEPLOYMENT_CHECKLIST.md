# Vercel Deployment Checklist

Use this before sharing the Conduit Social Command Center from a public URL.

## Vercel Project

- [ ] Push the app to GitHub or another Git provider.
- [ ] Create a Vercel project from the repository.
- [ ] Confirm the framework preset is `Next.js`.
- [ ] Deploy once after adding environment variables.

## Environment Variables

Add these in Vercel Project Settings > Environment Variables:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`

Optional:

- [ ] `OPENAI_MODEL`

Security check:

- [ ] `OPENAI_API_KEY` is not prefixed with `NEXT_PUBLIC_`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not prefixed with `NEXT_PUBLIC_`.
- [ ] Only Supabase URL and anon key use `NEXT_PUBLIC_`.

## Supabase

- [ ] Run `supabase/schema.sql` in Supabase SQL Editor.
- [ ] Confirm the `campaign-media` storage bucket exists.
- [ ] Confirm RLS policies are installed.
- [ ] In Supabase Auth URL Configuration, set the production Site URL.
- [ ] Add this production redirect URL:

```text
https://YOUR-VERCEL-DOMAIN/reset-password
```

For local development only, keep this redirect URL allowed:

```text
http://localhost:3000/reset-password
```

## Smoke Test

- [ ] Open the Vercel URL.
- [ ] Sign up or sign in.
- [ ] Confirm the default `Conduit` workspace loads.
- [ ] Load demo data.
- [ ] Create a post.
- [ ] Generate drafts with OpenAI or mock fallback.
- [ ] Approve one draft.
- [ ] Confirm it appears in Ready to Post.
- [ ] Upload a small image to Media Library.
- [ ] Fetch a public website URL into Company Knowledge.
- [ ] Upload a supported Company Knowledge document under 8MB.
- [ ] Mark a queued post as Posted and add metrics.
- [ ] Confirm Analytics updates.
- [ ] Test `Forgot password?` and confirm the email opens `/reset-password`.

## Known Limits

- Social account OAuth/publishing is not connected yet.
- Social profile URLs are stored but not synced.
- Company Knowledge website fetching supports public webpages only.
- Document extraction supports text, Markdown, transcript text, and some readable PDFs.
- Very large image uploads may exceed serverless request limits during AI image analysis.
