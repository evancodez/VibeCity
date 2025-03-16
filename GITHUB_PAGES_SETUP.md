# Setting Up Your GitHub Pages Site

Follow these steps to push your Vibe City game to GitHub Pages:

## 1. Initialize Git Repository (if not done already)

```bash
git init
```

## 2. Add All Files to the Repository

```bash
git add .
```

## 3. Commit the Changes

```bash
git commit -m "Initial commit of Vibe City game"
```

## 4. Connect to Your Remote Repository

```bash
git remote add origin https://github.com/evancodez/VibeCity.git
```

## 5. Push to GitHub

```bash
git push -u origin main
```

Note: If you're using a different branch name (like "master"), replace "main" with your branch name.

## 6. Enable GitHub Pages

1. Go to your repository on GitHub: https://github.com/evancodez/VibeCity
2. Click on "Settings"
3. Scroll down to the "GitHub Pages" section
4. Under "Source", select "main" branch (or whichever branch you pushed to)
5. Click "Save"

## 7. Wait for Deployment

GitHub may take a few minutes to deploy your site. Once it's ready, you can access it at:
https://evancodez.github.io/VibeCity/

## Updating Your Site

Whenever you make changes to your game:

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

2. Push to GitHub:
   ```bash
   git push origin main
   ```

Your GitHub Pages site will automatically update with the new changes. 