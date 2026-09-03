const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
content = content.replace(
  'const [previewModalReel, setPreviewModalReel] = useState<any>(null);',
  'const [previewModalReel, setPreviewModalReel] = useState<any>(null);\n  const [editingReel, setEditingReel] = useState<any>(null);\n  const [isSeedingReviews, setIsSeedingReviews] = useState(false);'
);
fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
