rm -rf build
mkdir build
npx rollup game.mjs --format iife --file build/game.js
cp index-build.html build/index.html
cp *.png build
zip -r build.zip build