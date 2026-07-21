<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/06af2a02-5eef-4f88-aee9-41c26cf85121

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set your Supabase values in [.env.local](.env.local):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
   - `VITE_SITE_URL` for your production frontend, for example `https://www.fxjournalpro.com`
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Google Sign-In

To enable Google sign-in with Supabase:

1. In Supabase Dashboard, enable the Google provider under Authentication.
2. Add your Google OAuth client ID and secret in Supabase.
3. Set the Supabase Site URL to your production frontend, for example `https://www.fxjournalpro.com`.
4. Add redirect URLs for local and production use, such as:
   - `http://localhost:3000/**`
   - `https://www.fxjournalpro.com/**`
   - your Vercel preview URL pattern if you use previews
