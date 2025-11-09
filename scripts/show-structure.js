const fs = 'fs';
const path = 'path';

const ignore = ['node_modules', '.next', '.git', 'dist', 'build', 'coverage'];

function printTree(dir, prefix = '', level = 0, maxLevel = 4) {
  if (level > maxLevel) return;
  
  const files = fs.readdirSync(dir);
  
  files.forEach((file, index) => {
    if (ignore.includes(file)) return;
    
    const filePath = path.join(dir, file);
    const isLast = index === files.length - 1;
    const stats = fs.statSync(filePath);
    
    console.log(`${prefix}${isLast ? '└── ' : '├── '}${file}`);
    
    if (stats.isDirectory()) {
      printTree(filePath, `${prefix}${isLast ? '    ' : '│   '}`, level + 1, maxLevel);
    }
  });
}

printTree('.');