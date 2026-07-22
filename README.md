# Instagram Follow Analyzer

A responsive React + Tailwind dashboard that compares a public account's
followers and following to surface mutuals, fans, and accounts that don't
follow back.

> **Note:** Instagram does not provide a public API for reading another
> account's followers/following list, and scraping it violates Instagram's
> Terms of Use. This project uses a local, deterministic mock data generator
> so the interface is fully functional for demo purposes. No real Instagram
> data is accessed, scraped, or stored.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Build for production

```bash
npm run build
```

Output goes to the `dist/` folder.

## Deploy

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Instagram Follow Analyzer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/instagram-follow-analyzer.git
git push -u origin main
```

### Deploy on Vercel
1. Go to https://vercel.com/new
2. Import the `instagram-follow-analyzer` GitHub repo
3. Vercel auto-detects Vite — leave build command (`vite build`) and output
   directory (`dist`) at their defaults
4. Click **Deploy**

Every subsequent `git push` to `main` auto-redeploys.
