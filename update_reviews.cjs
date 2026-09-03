const fs = require('fs');

let content = fs.readFileSync('src/components/Reviews.tsx', 'utf8');

// Update imports
content = content.replace(
  'import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";',
  'import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";\nimport { motion } from "motion/react";\nimport { Trash2 } from "lucide-react";'
);

// Add deviceToken logic
const deviceTokenLogic = `
  const [deviceToken, setDeviceToken] = useState("");
  useEffect(() => {
    let token = localStorage.getItem("bagichi_reviewer_id");
    if (!token) {
      token = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("bagichi_reviewer_id", token);
    }
    setDeviceToken(token);
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm("Are you sure you want to delete this review?")) {
      try {
        await deleteDoc(doc(db, "reviews", reviewId));
      } catch(err) {
        console.error("Failed to delete review", err);
        alert("Could not delete review.");
      }
    }
  };
`;

content = content.replace(
  'const [filterRating, setFilterRating] = useState<number | \'all\'>(\'all\');',
  'const [filterRating, setFilterRating] = useState<number | \'all\'>(\'all\');\n' + deviceTokenLogic
);

// Update addDoc to include deviceToken
content = content.replace(
  'createdAt: serverTimestamp(),\n        likes: 0\n      });',
  'createdAt: serverTimestamp(),\n        likes: 0,\n        deviceToken: deviceToken\n      });'
);

// Update parsing to include deviceToken
content = content.replace(
  'createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),\n              likes: data.likes || 0\n            };',
  'createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),\n              likes: data.likes || 0,\n              deviceToken: data.deviceToken\n            };'
);

// Add shimmer loader
const shimmerLoader = `
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-lg h-64 overflow-hidden relative isolate">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
                />
                <div className="w-1/3 h-4 bg-white/10 rounded-full mb-6"></div>
                <div className="space-y-3 mb-6">
                  <div className="w-full h-3 bg-white/10 rounded-full"></div>
                  <div className="w-5/6 h-3 bg-white/10 rounded-full"></div>
                  <div className="w-4/6 h-3 bg-white/10 rounded-full"></div>
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                  <div className="w-1/4 h-3 bg-white/10 rounded-full"></div>
                  <div className="w-1/5 h-3 bg-white/10 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
`;
content = content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">',
  shimmerLoader
);

// Close shimmer block
content = content.replace(
  '</div>\n    </section>',
  '</div>\n        )}\n    </section>'
);

// Add delete button in UI
content = content.replace(
  'className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-lg relative flex flex-col justify-between hover:border-[#e8a33d]/40 transition-all group"\n          >',
  'className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-lg relative flex flex-col justify-between hover:border-[#e8a33d]/40 transition-all group"\n          >\n            {review.deviceToken === deviceToken && !review.id.startsWith("fb-") && (\n              <button onClick={() => handleDeleteReview(review.id)} className="absolute top-5 left-5 p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors z-20" title="Delete my review">\n                <Trash2 className="w-4 h-4" />\n              </button>\n            )}'
);

fs.writeFileSync('src/components/Reviews.tsx', content);
console.log("Reviews.tsx updated");
