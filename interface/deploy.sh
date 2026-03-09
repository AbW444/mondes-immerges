#!/bin/bash

# Script de déploiement pour l'interface globe
# Copie les fichiers buildés vers le dossier racine pour GitHub Pages

echo "🏗️  Building interface..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "📦 Deploying built files..."

# Sauvegarder le dossier src et les fichiers de config
echo "  - Keeping source files in place..."

# Copier index.html du build vers la racine du dossier interface
echo "  - Copying index.html..."
cp -f dist/index.html ../interface-temp-index.html

# Copier le dossier assets
echo "  - Copying assets..."
rm -rf ../interface-temp-assets
cp -r dist/assets ../interface-temp-assets

# Copier les autres dossiers (fonts, images, videos)
echo "  - Copying fonts, images, videos..."
cp -rf dist/fonts ../interface-temp-fonts 2>/dev/null || echo "  - No fonts to copy"
cp -rf dist/images ../interface-temp-images 2>/dev/null || echo "  - No images to copy"
cp -rf dist/videos ../interface-temp-videos 2>/dev/null || echo "  - No videos to copy"

# Déplacer les fichiers temporaires
echo "  - Moving files to interface folder..."
mv -f ../interface-temp-index.html ./index.html
rm -rf ./assets
mv ../interface-temp-assets ./assets

[ -d ../interface-temp-fonts ] && (rm -rf ./fonts; mv ../interface-temp-fonts ./fonts)
[ -d ../interface-temp-images ] && (rm -rf ./images; mv ../interface-temp-images ./images)
[ -d ../interface-temp-videos ] && (rm -rf ./videos; mv ../interface-temp-videos ./videos)

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit: git add -A && git commit -m 'Deploy interface build'"
echo "  3. Push: git push"
