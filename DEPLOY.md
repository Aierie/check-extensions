# Manual Deployment to GitHub Pages

This document describes how to manually deploy the VS Code Extension Analyzer web application to GitHub Pages using the `/docs` folder approach. This method does not require the `gh-pages` npm package or a separate branch.

---

## Prerequisites

Before deploying, ensure you have the following:

1. **Node.js and npm**  
   - Node.js version 14 or higher  
   - npm (comes with Node.js)

2. **GitHub Repository**  
   - Your project must be pushed to a GitHub repository (e.g., `https://github.com/your-username/check-extensions`).

3. **Vite base config**  
   - Your `vite.config.js` should set the `base` option to the repo name for production:  
     ```js
     base: process.env.NODE_ENV === 'production' ? '/check-extensions/' : '/'
     ```

---

## Deployment Steps (Using `/docs` Folder)

1. **Build Your Site**

   Run the Vite build command to generate the production files in the `docs` directory:
   ```bash
   npm run build
   ```

2. **Commit and Push the `docs` Folder**

   Add the `docs` folder to your repository and push:
   ```bash
   git add docs
   git commit -m "Build for GitHub Pages"
   git push
   ```

3. **Configure GitHub Pages in Repository Settings**

   - Go to your repository on GitHub.
   - Click on **Settings** > **Pages**.
   - Under **Source**, select the `main` branch and `/docs` folder.
   - Save the settings.

4. **Access Your Deployed Site**

   - After a few minutes, your site will be available at:  
     ```
     https://your-username.github.io/check-extensions/
     ```

---

## Notes

- If you change your repository name, update the `base` option in `vite.config.js`.
- If you encounter a blank page or 404, ensure the `base` path matches your repository name and that the GitHub Pages source is set to the `/docs` folder on the `main` branch.
- The `/docs` folder must be committed to your repository for GitHub Pages to serve it.

---

**For troubleshooting, see the README or open an issue on your repository.**

--- 