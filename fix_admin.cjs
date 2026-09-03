const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Add edit states for reels
content = content.replace(
  'const [previewModalReel, setPreviewModalReel] = useState<any | null>(null);',
  'const [previewModalReel, setPreviewModalReel] = useState<any | null>(null);\n  const [editingReel, setEditingReel] = useState<any | null>(null);\n  const [isSeedingReviews, setIsSeedingReviews] = useState(false);'
);

const handleUpdateReel = `
  const handleUpdateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReel) return;
    try {
      const { id, ...data } = editingReel;
      await updateDoc(doc(db, 'featuredReels', id), data);
      setEditingReel(null);
      showNotification('Reel updated successfully');
    } catch (err) {
      console.error('Failed to update reel:', err);
    }
  };
`;

const handleSeedDefaultReviews = `
  const handleSeedDefaultReviews = async () => {
    setIsSeedingReviews(true);
    try {
      const INITIAL_FALLBACK_REVIEWS = [
        {
          authorName: "Afreen R.",
          rating: 5,
          comment: "Ambience and cleanliness was very good. Food top notch. Special mention to the royal garden seating under the evening lights!"
        },
        {
          authorName: "Lav P.",
          rating: 5,
          comment: "Lush green garden, spacious restaurant, delicious food will make your experience unforgettable. Good option for lunch and caters to big groups with ease."
        },
        {
          authorName: "Wanderlog Reviewer",
          rating: 5,
          comment: "A truly delightful dining experience. The ambiance is charming, with lovely lighting and comfortable outdoor seating."
        },
        {
          authorName: "Vikram Mehta",
          rating: 4,
          comment: "The Dal Makhani and Garlic Naan were extraordinary. Great highway stop with ample parking and peaceful greenery."
        }
      ];
      const batch = writeBatch(db);
      for (const rev of INITIAL_FALLBACK_REVIEWS) {
        const newDocRef = doc(collection(db, 'reviews'));
        batch.set(newDocRef, { ...rev, createdAt: serverTimestamp(), likes: 0 });
      }
      await batch.commit();
      showNotification('Default reviews loaded into database successfully!');
    } catch (err) {
      console.error('Failed to seed default reviews:', err);
    } finally {
      setIsSeedingReviews(false);
    }
  };
`;

content = content.replace(
  'const handleDeleteReel = async (id: string) => {',
  handleUpdateReel + '\n' + handleSeedDefaultReviews + '\n  const handleDeleteReel = async (id: string) => {'
);

const editReelButton = `
                                  <button
                                    onClick={() => setEditingReel(reel)}
                                    className="w-7 h-7 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-lg"
                                    title="Edit Reel"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                  </button>
`;

content = content.replace(
  '<Trash2 className="w-3.5 h-3.5" />\n                                  </button>',
  '<Trash2 className="w-3.5 h-3.5" />\n                                  </button>' + editReelButton
);

const seedReviewsButton = `
                        <button onClick={handleSeedDefaultReviews} disabled={isSeedingReviews} className="mt-4 px-4 py-2 bg-[#e8a33d] text-black font-bold text-xs rounded-xl">
                          {isSeedingReviews ? 'Loading...' : 'Load Default Reviews'}
                        </button>
`;

content = content.replace(
  'Customer reviews submitted on the public website will show here sorted by star rating.\n                        </p>',
  'Customer reviews submitted on the public website will show here sorted by star rating.\n                        </p>' + seedReviewsButton
);


const editReelModal = `
      {/* Edit Reel Modal */}
      <AnimatePresence>
        {editingReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#120f0d] border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-lg shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white">Edit Reel</h3>
              <form onSubmit={handleUpdateReel} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Title</label>
                  <input type="text" value={editingReel.title} onChange={e => setEditingReel({...editingReel, title: e.target.value})} className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#e8a33d] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Caption</label>
                  <textarea value={editingReel.caption} onChange={e => setEditingReel({...editingReel, caption: e.target.value})} className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#e8a33d] outline-none min-h-[80px]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Author Handle</label>
                  <input type="text" value={editingReel.authorHandle} onChange={e => setEditingReel({...editingReel, authorHandle: e.target.value})} className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#e8a33d] outline-none" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setEditingReel(null)} className="px-5 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 font-bold text-xs">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-[#e8a33d] text-black font-bold text-xs">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

content = content.replace(
  '{/* Toast Notifications */}',
  editReelModal + '\n      {/* Toast Notifications */}'
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
console.log("AdminDashboard.tsx updated");
