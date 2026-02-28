import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('src', function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let orig = content;
        // We are replacing text-gray-400 -> text-gray-300
        // and text-gray-500 -> text-gray-400
        content = content.replace(/text-gray-300/g, 'text-gray-200'); // bumping existing up
        content = content.replace(/text-gray-400/g, 'text-gray-300');
        content = content.replace(/text-gray-500/g, 'text-gray-400');

        if (orig !== content) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
