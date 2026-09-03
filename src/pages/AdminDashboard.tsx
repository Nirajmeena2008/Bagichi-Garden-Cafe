import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, storage } from '../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  CalendarDays, 
  UtensilsCrossed, 
  Video, 
  Plus, 
  Trash2, 
  CheckCircle,
  XCircle,
  Loader2,
  Edit3,
  Eye,
  Search,
  Sparkles,
  Check,
  ImageIcon,
  RefreshCw,
  Layers,
  X,
  ArrowRight,
  ExternalLink,
  Flame,
  Leaf,
  Camera,
  Film,
  Play,
  Volume2,
  Smartphone,
  UploadCloud,
  Pin,
  Heart,
  MessageCircle,
  Star,
  MessageSquare,
  BarChart2,
  UserCheck,
  ThumbsUp,
  Filter,
  HardDrive,
  FileText,
  ChefHat,
  ShoppingBag
} from 'lucide-react';
import { parseSocialVideoUrl, SAMPLE_RESTAURANT_REELS } from '../lib/videoUtils';
import { ReelComment, Review } from '../types';
import GoogleDriveManager from '../components/GoogleDriveManager';
import KitchenDisplaySystem from '../components/KitchenDisplaySystem';
import AdminOrderManagement from '../components/AdminOrderManagement';
import { formatBookingReceiptText } from '../lib/googleDrive';
import { soundManager } from '../lib/soundAlert';

const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = 1;
    };
    video.onseeked = () => {
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    setTimeout(() => resolve(''), 3000);
  });
};

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable?: boolean;
  isSpicy?: boolean;
  isChefSpecial?: boolean;
  dietary?: string;
  createdAt?: any;
}

const PRESET_CATEGORIES = [
  "Starters",
  "Main Course",
  "Italian",
  "Desserts & Beverages",
  "Tandoor Specials",
  "Chinese & Oriental",
  "Mocktails & Shakes",
  "Breads & Rice"
];

const SUGGESTED_IMAGES = [
  { label: "Paneer Tikka", url: "https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&q=80&w=800" },
  { label: "Spring Rolls", url: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=800" },
  { label: "Dal Makhani", url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800" },
  { label: "Paneer Gravy", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800" },
  { label: "Dum Biryani", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800" },
  { label: "Pasta Italian", url: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&q=80&w=800" },
  { label: "Sizzler Brownie", url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800" },
  { label: "Iced Beverage", url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings' | 'menu' | 'reels' | 'comments' | 'reviews' | 'drive' | 'kds'>('orders');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Data states
  const [bookings, setBookings] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [viewingReceiptBooking, setViewingReceiptBooking] = useState<any | null>(null);

  // Reel & Comment Moderation States
  const [selectedCommentReelFilter, setSelectedCommentReelFilter] = useState<string>('all');
  const [editingComment, setEditingComment] = useState<ReelComment | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>('');
  const [reelStatsModal, setReelStatsModal] = useState<any | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Menu Search & Filter States
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Menu Modals & Form States
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [viewingItem, setViewingItem] = useState<MenuItemData | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);


  // New Menu Form
  const [newMenu, setNewMenu] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Starters',
    customCategory: '',
    imageUrl: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&q=80&w=800',
    isAvailable: true,
    isSpicy: false,
    isChefSpecial: false,
    dietary: 'Vegetarian'
  });

  // Edit Menu Form
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    customCategory: '',
    imageUrl: '',
    isAvailable: true,
    isSpicy: false,
    isChefSpecial: false,
    dietary: 'Vegetarian'
  });

  // Reel Form
  const [newReel, setNewReel] = useState({
    url: '',
    caption: '',
    title: '',
    aspectRatio: 'auto',
    authorHandle: '@thebagichigarden',
  });
  const [uploadMethod, setUploadMethod] = useState<'link' | 'file'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>('');

  const [isSeedingReels, setIsSeedingReels] = useState(false);
  const [previewModalReel, setPreviewModalReel] = useState<any>(null);
  const [editingReel, setEditingReel] = useState<any>(null);
  const [isSeedingReviews, setIsSeedingReviews] = useState(false);
  const [deletingReelId, setDeletingReelId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>('');
  const [backgroundUploads, setBackgroundUploads] = useState<{id: string, name: string, progress: number}[]>([]);
  const activeUploads = useRef<{ [key: string]: any }>({});
  
  const handleCancelUpload = (uploadId: string) => {
    if (activeUploads.current[uploadId]) {
      activeUploads.current[uploadId].cancel();
      delete activeUploads.current[uploadId];
    }
    setBackgroundUploads(prev => prev.filter(u => u.id !== uploadId));
    showNotification('Upload cancelled');
  };
  
  const [debouncedReelUrl, setDebouncedReelUrl] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReelUrl(newReel.url);
    }, 800);
    return () => clearTimeout(timer);
  }, [newReel.url]);

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!newReel.title) {
      setNewReel(prev => ({ ...prev, title: file.name.split('.')[0] }));
    }
    
    // Generate thumbnail in background
    generateVideoThumbnail(file).then(thumb => setThumbnailDataUrl(thumb));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin');
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const initialBookingsLoaded = useRef(false);
  const knownBookingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;

    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(qBookings, (snap) => {
      let hasNewBooking = false;
      const fetchedBookings = snap.docs.map(d => {
        if (initialBookingsLoaded.current && !knownBookingIds.current.has(d.id)) {
          hasNewBooking = true;
        }
        knownBookingIds.current.add(d.id);
        return { id: d.id, ...d.data() };
      });
      if (hasNewBooking) {
        soundManager.playReservationAlert();
        showNotification('New Table Reservation Received!');
      }
      initialBookingsLoaded.current = true;
      setBookings(fetchedBookings);
    });

    const qMenu = query(collection(db, 'menuItems'), orderBy('category'));
    const unsubMenu = onSnapshot(qMenu, (snap) => {
      setMenuItems(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          category: data.category || 'Main Course',
          imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
          isAvailable: data.isAvailable !== false,
          isSpicy: Boolean(data.isSpicy),
          isChefSpecial: Boolean(data.isChefSpecial),
          dietary: data.dietary || 'Vegetarian',
          createdAt: data.createdAt
        };
      }));
    });

    const qReels = query(collection(db, 'featuredReels'), orderBy('createdAt', 'desc'));
    const unsubReels = onSnapshot(qReels, (snap) => {
      setReels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qComments = query(collection(db, 'reelComments'), orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReelComment)));
    });

    const qReviews = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });

    return () => {
      unsubBookings();
      unsubMenu();
      unsubReels();
      unsubComments();
      unsubReviews();
    };
  }, [loading]);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setActionSuccess(''), 4500);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin');
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'bookings', id), { status });
  };

  // Comment Moderation Handlers (Admin Exclusive)
  const handleTogglePinComment = async (comment: ReelComment) => {
    try {
      const nextPinned = !comment.isPinned;
      await updateDoc(doc(db, 'reelComments', comment.id), {
        isPinned: nextPinned,
        pinnedAt: nextPinned ? serverTimestamp() : null
      });
      showNotification(nextPinned ? 'Comment pinned to top!' : 'Comment unpinned');
    } catch (err) {
      console.error('Failed to pin comment:', err);
      showNotification('Failed to update pin status');
    }
  };

  const handleToggleAdminLikeComment = async (comment: ReelComment) => {
    try {
      const nextLiked = !comment.adminLiked;
      await updateDoc(doc(db, 'reelComments', comment.id), {
        adminLiked: nextLiked,
        likesCount: nextLiked ? (comment.likesCount || 0) + 1 : Math.max(0, (comment.likesCount || 1) - 1)
      });
      showNotification(nextLiked ? 'Liked comment as Admin!' : 'Removed admin like');
    } catch (err) {
      console.error('Failed to like comment:', err);
      showNotification('Failed to update like status');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'reelComments', commentId));
      setDeletingCommentId(null);
      showNotification('Comment deleted permanently');
    } catch (err) {
      console.error('Failed to delete comment:', err);
      showNotification('Failed to delete comment');
    }
  };

  const handleOpenEditComment = (comment: ReelComment) => {
    setEditingComment(comment);
    setEditCommentText(comment.text);
  };

  const handleSaveEditComment = async () => {
    if (!editingComment || !editCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'reelComments', editingComment.id), {
        text: editCommentText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingComment(null);
      showNotification('Comment updated successfully!');
    } catch (err) {
      console.error('Failed to update comment:', err);
      showNotification('Failed to update comment');
    }
  };

  // Review Moderation Handler
  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setDeletingReviewId(null);
      showNotification('Review removed successfully');
    } catch (err) {
      console.error('Failed to delete review:', err);
      showNotification('Failed to delete review');
    }
  };

  // Seed default items from menu.json into Firestore
  const handleSeedDefaultMenu = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/menu.json');
      const defaultItems = await res.json();
      const batch = writeBatch(db);

      for (const item of defaultItems) {
        const newDocRef = doc(collection(db, 'menuItems'));
        batch.set(newDocRef, {
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          imageUrl: item.imageUrl,
          isAvailable: true,
          dietary: 'Vegetarian',
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      showNotification('Default restaurant menu loaded into database successfully!');
    } catch (err) {
      console.error('Failed to seed default menu:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ADD MENU ITEM
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const category = newMenu.category === 'Custom' && newMenu.customCategory.trim() 
      ? newMenu.customCategory.trim() 
      : newMenu.category;

    try {
      await addDoc(collection(db, 'menuItems'), {
        name: newMenu.name.trim(),
        description: newMenu.description.trim(),
        price: Number(newMenu.price),
        category,
        imageUrl: newMenu.imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
        isAvailable: newMenu.isAvailable,
        isSpicy: newMenu.isSpicy,
        isChefSpecial: newMenu.isChefSpecial,
        dietary: newMenu.dietary,
        createdAt: serverTimestamp()
      });

      setNewMenu({
        name: '',
        description: '',
        price: '',
        category: 'Starters',
        customCategory: '',
        imageUrl: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&q=80&w=800',
        isAvailable: true,
        isSpicy: false,
        isChefSpecial: false,
        dietary: 'Vegetarian'
      });
      setIsAddMenuOpen(false);
      showNotification(`Added "${newMenu.name}" to the menu!`);
    } catch (err) {
      console.error('Error adding menu item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (item: MenuItemData) => {
    const isPreset = PRESET_CATEGORIES.includes(item.category);
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: isPreset ? item.category : 'Custom',
      customCategory: isPreset ? '' : item.category,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable ?? true,
      isSpicy: item.isSpicy ?? false,
      isChefSpecial: item.isChefSpecial ?? false,
      dietary: item.dietary || 'Vegetarian'
    });
  };

  // SAVE EDITED MENU ITEM
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSubmitting(true);
    const category = editFormData.category === 'Custom' && editFormData.customCategory.trim() 
      ? editFormData.customCategory.trim() 
      : editFormData.category;

    try {
      await updateDoc(doc(db, 'menuItems', editingItem.id), {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        price: Number(editFormData.price),
        category,
        imageUrl: editFormData.imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
        isAvailable: editFormData.isAvailable,
        isSpicy: editFormData.isSpicy,
        isChefSpecial: editFormData.isChefSpecial,
        dietary: editFormData.dietary
      });

      showNotification(`Updated "${editFormData.name}" successfully!`);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update menu item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TOGGLE AVAILABILITY
  const handleToggleAvailability = async (item: MenuItemData) => {
    const newStatus = !(item.isAvailable ?? true);
    try {
      await updateDoc(doc(db, 'menuItems', item.id), { isAvailable: newStatus });
      showNotification(`Marked "${item.name}" as ${newStatus ? 'Available' : 'Sold Out'}`);
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  // DELETE MENU ITEM
  const confirmDeleteMenu = async () => {
    if (!deletingItemId) return;
    const id = deletingItemId;
    // Optimistic UI: Close modal instantly
    setDeletingItemId(null);
    try {
      await deleteDoc(doc(db, 'menuItems', id));
      showNotification('Menu item removed successfully.');
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // REELS HANDLERS
  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isLink = uploadMethod === 'link';
    
    if (isLink && !newReel.url.trim()) {
      showNotification('Please enter a video link.');
      return;
    }
    if (!isLink && !selectedFile) {
      showNotification('Please select a video file.');
      return;
    }

    // Default auto caption if empty
    const finalCaption = newReel.caption.trim() || 'Enjoy this beautiful moment at The Bagichi Garden Restaurant.';
    const finalTitle = newReel.title.trim() || (isLink ? 'Bagichi Moments' : (selectedFile?.name.split('.')[0] || 'Bagichi Video'));
    const finalAuthor = newReel.authorHandle.trim() || '@thebagichigarden';
    
    const currentUrl = newReel.url.trim();
    const currentAspectRatio = newReel.aspectRatio;
    const fileToUpload = selectedFile;
    const thumbnailToUpload = thumbnailDataUrl;
    const uploadId = Date.now().toString();

    // Reset form entirely immediately for Instant UI feedback
    setNewReel({
      url: '',
      caption: '',
      title: '',
      aspectRatio: 'auto',
      authorHandle: '@thebagichigarden',
    });
    setSelectedFile(null);
    setThumbnailDataUrl('');
    
    // Process entirely in background
    (async () => {
      try {
        if (!isLink && fileToUpload) {
          setBackgroundUploads(prev => [...prev, { id: uploadId, name: fileToUpload.name, progress: 0 }]);
        } else {
          showNotification('Publishing Reel...');
        }

        // Asynchronously remove any sample reels without blocking
        getDocs(collection(db, 'featuredReels')).then(currentReelsSnap => {
          const sampleReels = currentReelsSnap.docs.filter(d => typeof d.data().views !== 'number');
          if (sampleReels.length > 0) {
            const batch = writeBatch(db);
            sampleReels.forEach(d => batch.delete(d.ref));
            batch.commit().catch(console.error);
          }
        }).catch(console.error);

        let finalUrl = currentUrl;
        let platform = 'direct';
        let aspectRatio = currentAspectRatio;
        let thumbnailUrl = '';
        let embedUrl = '';

        if (isLink) {
          const parsed = parseSocialVideoUrl(finalUrl, aspectRatio);
          platform = parsed.platform;
          aspectRatio = aspectRatio === 'auto' ? parsed.aspectRatio : aspectRatio;
          thumbnailUrl = parsed.thumbnailUrl || '';
          embedUrl = parsed.isDirectVideo ? parsed.embedUrl : '';
        } else if (fileToUpload) {
          const storageRef = ref(storage, `reels/${Date.now()}_${fileToUpload.name}`);
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
          activeUploads.current[uploadId] = uploadTask;
          
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setBackgroundUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: Math.round(progress) } : u));
              }, 
              (error) => {
                delete activeUploads.current[uploadId];
                reject(error);
              }, 
              () => {
                delete activeUploads.current[uploadId];
                resolve(true);
              }
            );
          });
          finalUrl = await getDownloadURL(uploadTask.snapshot.ref);
          thumbnailUrl = thumbnailToUpload;
          embedUrl = finalUrl;
        }

        await addDoc(collection(db, 'featuredReels'), {
          url: finalUrl,
          caption: finalCaption,
          title: finalTitle,
          platform: platform,
          aspectRatio: aspectRatio,
          thumbnailUrl: thumbnailUrl,
          authorHandle: finalAuthor,
          likes: 0,
          views: 0,
          videoUrl: embedUrl,
          createdAt: serverTimestamp()
        });

        if (!isLink && fileToUpload) {
           setBackgroundUploads(prev => prev.filter(u => u.id !== uploadId));
        }
        showNotification('Published reel to website successfully!');
      } catch (err) {
        console.error('Failed to add reel:', err);
        if (!isLink && fileToUpload) {
           setBackgroundUploads(prev => prev.filter(u => u.id !== uploadId));
        }
        showNotification('Failed to upload video.');
      }
    })();
  };

  const handleSeedDefaultReels = async () => {
    setIsSeedingReels(true);
    try {
      const batch = writeBatch(db);
      SAMPLE_RESTAURANT_REELS.forEach((item) => {
        const newDocRef = doc(collection(db, 'featuredReels'));
        batch.set(newDocRef, {
          url: item.videoUrl || item.url,
          videoUrl: item.videoUrl,
          caption: item.caption,
          title: item.title,
          platform: item.platform,
          aspectRatio: item.aspectRatio,
          authorHandle: item.authorHandle,
          likes: item.likes,
          thumbnailUrl: item.url,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      showNotification('Loaded 4 official Bagichi Garden showcase reels!');
    } catch (err) {
      console.error('Error seeding sample reels:', err);
    } finally {
      setIsSeedingReels(false);
    }
  };

  
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

  const handleDeleteReel = async (id: string) => {
    // Optimistic UI: Close modal instantly
    setDeletingReelId(null);
    try {
      await deleteDoc(doc(db, 'featuredReels', id));
      showNotification('Reel removed from website.');
    } catch (err) {
      console.error('Failed to delete reel:', err);
    }
  };

  // Filtered Menu Items
  const allCategories = ['All', ...Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)))];
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
                          item.description.toLowerCase().includes(menuSearch.toLowerCase()) ||
                          item.category.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- AUTO-SEED LOGIC ---
  const hasAutoSeeded = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (hasAutoSeeded.current) return;

    // Delay the check to ensure Firebase Auth token has propagated to Firestore
    const timer = setTimeout(async () => {
      hasAutoSeeded.current = true;
      try {
        const [menuSnap, reelsSnap] = await Promise.all([
          getDocs(collection(db, 'menuItems')),
          getDocs(collection(db, 'featuredReels'))
        ]);
        
        if (menuSnap.empty) {
          handleSeedDefaultMenu();
        }
        if (reelsSnap.empty) {
          handleSeedDefaultReels();
        }
      } catch (err) {
        console.error("Auto-seed check failed:", err);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080706] flex items-center justify-center p-6">
        <div className="w-full max-w-4xl h-96 rounded-3xl bg-[#120f0d] border border-white/5 relative overflow-hidden flex flex-col items-center justify-center isolate">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
          />
          <div className="w-16 h-16 rounded-full bg-white/10 mb-6"></div>
          <div className="w-48 h-4 rounded-full bg-white/10 mb-3"></div>
          <div className="w-32 h-4 rounded-full bg-white/10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080706] text-[#f4f2ee]">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-[#e8a33d] text-black font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Uploads Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {backgroundUploads.map(upload => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className="bg-[#120f0d] border border-[#e8a33d]/30 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-2 w-72 pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold truncate pr-2 text-[#e8a33d]">{upload.name}</span>
                <span className="text-[10px] font-bold text-white/60">{upload.progress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#e8a33d] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-[#e8a33d] animate-spin" />
                  <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Uploading Reel...</span>
                </div>
                <button
                  onClick={() => handleCancelUpload(upload.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header */}
      <header className="bg-[#120f0d] border-b border-[#e8a33d]/20 py-4 px-6 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 bg-[#e8a33d] rounded-xl flex items-center justify-center font-bold text-black text-xl hover:scale-105 transition-transform shadow-lg shadow-[#e8a33d]/20">
              B
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">The Bagichi Admin</h1>
                <span className="bg-[#e8a33d]/15 text-[#e8a33d] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#e8a33d]/30">
                  Live Portal
                </span>
              </div>
              <p className="text-xs text-white/50 hidden sm:block">Manage Reservations, Live Culinary Menu & Media Spotlight</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to="/kds"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
              title="Open full-screen Kitchen Display System"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen Screen (KDS)</span>
            </Link>
            <Link
              to="/drive-records"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e8a33d]/15 hover:bg-[#e8a33d]/25 text-[#e8a33d] border border-[#e8a33d]/30 text-xs font-semibold transition-colors"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Drive Records</span>
            </Link>
            <Link
              to="/menu"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 border border-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Public Menu
            </Link>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Tabs */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {[
            { id: 'orders', icon: ShoppingBag, label: 'Order Management & KOT', count: 'Live' },
            { id: 'bookings', icon: CalendarDays, label: 'Reservations', count: bookings.length },
            { id: 'kds', icon: ChefHat, label: 'Kitchen (KDS & POS)', count: 'Live' },
            { id: 'menu', icon: UtensilsCrossed, label: 'Manage Menu', count: menuItems.length },
            { id: 'reels', icon: Video, label: 'Social Reels', count: reels.length },
            { id: 'comments', icon: MessageSquare, label: 'Comments Moderation', count: comments.length },
            { id: 'reviews', icon: Star, label: 'Guest Reviews', count: reviews.length },
            { id: 'drive', icon: HardDrive, label: 'Google Drive Database', count: 'Drive' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all whitespace-nowrap text-left w-full ${
                  isActive 
                    ? 'bg-[#e8a33d] text-black font-bold shadow-lg shadow-[#e8a33d]/20' 
                    : 'bg-[#120f0d] text-white/70 hover:bg-[#1a1512] hover:text-white border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-[#e8a33d]'}`} />
                  <span className="text-sm font-semibold">{tab.label}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          <div className="hidden lg:block mt-6 p-4 rounded-2xl bg-[#120f0d] border border-white/5 text-xs text-white/50 space-y-2">
            <p className="font-semibold text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e8a33d]" /> Admin Moderation
            </p>
            <p>You can pin favorite comments to the top, like customer feedback, edit text, or remove content instantly.</p>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            
            {/* -------------------- ORDER MANAGEMENT & KOT TAB -------------------- */}
            {activeTab === 'orders' && (
              <motion.div
                key="orders-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-[#120f0d] p-5 sm:p-6 rounded-3xl border border-[#e8a33d]/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-white">Order Management System</h2>
                      <span className="text-xs bg-[#e8a33d]/15 text-[#e8a33d] font-bold px-2.5 py-0.5 rounded-full border border-[#e8a33d]/20">
                        Linked with KOT Engine
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Manage incoming online delivery and takeaway orders with customer details, Google Maps location assistance, and instant KOT generation.
                    </p>
                  </div>
                </div>

                <AdminOrderManagement onOpenKds={() => setActiveTab('kds')} />
              </motion.div>
            )}

            {/* -------------------- MANAGE MENU TAB -------------------- */}
            {activeTab === 'menu' && (
              <motion.div
                key="menu-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Menu Header & Quick Actions */}
                <div className="bg-[#120f0d] p-5 sm:p-6 rounded-3xl border border-[#e8a33d]/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-white">Culinary Menu Manager</h2>
                      <span className="text-xs bg-[#e8a33d]/15 text-[#e8a33d] font-bold px-2.5 py-0.5 rounded-full border border-[#e8a33d]/20">
                        {menuItems.length} Dishes
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Add new dishes, modify prices, update photos, manage stock availability, and remove items.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {menuItems.length === 0 && (
                      <button
                        onClick={handleSeedDefaultMenu}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all"
                      >
                        <RefreshCw className={`w-4 h-4 text-[#e8a33d] ${isSubmitting ? 'animate-spin' : ''}`} />
                        Load Default Menu
                      </button>
                    )}

                    <button
                      onClick={() => setIsAddMenuOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#e8a33d]/20"
                    >
                      <Plus className="w-4 h-4" /> Add Menu Item
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-[#120f0d] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center">
                  {/* Search */}
                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search dish, ingredient, category..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#e8a33d]"
                    />
                    {menuSearch && (
                      <button onClick={() => setMenuSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                    {allCategories.map((cat) => {
                      const isCatActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                            isCatActive
                              ? 'bg-[#e8a33d] text-black'
                              : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Menu List / Grid Display */}
                {filteredMenuItems.length === 0 ? (
                  <div className="bg-[#120f0d] rounded-3xl border border-white/5 p-12 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                      <UtensilsCrossed className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">No menu items found</h3>
                      <p className="text-xs text-white/50 mt-1 max-w-sm">
                        {menuSearch ? `No dishes matching "${menuSearch}". Try searching for something else.` : 'Your menu is currently empty. Add your first item or load the default menu.'}
                      </p>
                    </div>
                    {menuItems.length === 0 && (
                      <button
                        onClick={handleSeedDefaultMenu}
                        disabled={isSubmitting}
                        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a33d] text-black text-xs font-bold hover:bg-[#f3b55c] transition-all"
                      >
                        <RefreshCw className="w-4 h-4" /> Load Bagichi 12-Item Menu
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredMenuItems.map((item) => {
                      const isAvail = item.isAvailable ?? true;
                      return (
                        <motion.div
                          layout
                          key={item.id}
                          className={`bg-[#120f0d] rounded-2xl border overflow-hidden flex flex-col justify-between transition-all group ${
                            isAvail ? 'border-white/10 hover:border-[#e8a33d]/40' : 'border-rose-500/20 opacity-75'
                          }`}
                        >
                          {/* Image & Badges */}
                          <div className="h-40 relative bg-black/50 overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#120f0d] via-transparent to-black/40" />
                            
                            {/* Category & Status Badges */}
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                              <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-[#e8a33d] border border-[#e8a33d]/30">
                                {item.category}
                              </span>
                              {item.isChefSpecial && (
                                <span className="bg-[#e8a33d] text-black font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                  <Sparkles className="w-2.5 h-2.5" /> Chef's Pick
                                </span>
                              )}
                              {item.isSpicy && (
                                <span className="bg-rose-500/90 text-white font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Flame className="w-2.5 h-2.5" /> Spicy
                                </span>
                              )}
                            </div>

                            {/* Price Pill */}
                            <div className="absolute top-3 right-3 bg-black/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#e8a33d] border border-white/10">
                              ₹{item.price}
                            </div>

                            {/* Stock status overlay banner if sold out */}
                            {!isAvail && (
                              <div className="absolute bottom-2 left-3 right-3 bg-rose-500/90 text-white text-[10px] uppercase tracking-wider font-bold py-1 px-3 rounded-lg text-center backdrop-blur-md">
                                Currently Sold Out
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h3 className="font-bold text-white text-base group-hover:text-[#e8a33d] transition-colors line-clamp-1">
                                  {item.name}
                                </h3>
                              </div>
                              <p className="text-white/60 text-xs line-clamp-2 leading-[2.2] mb-3">
                                {item.description || 'Authentic fresh garden preparation.'}
                              </p>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
                              {/* Stock toggle */}
                              <button
                                onClick={() => handleToggleAvailability(item)}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                                  isAvail 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                }`}
                                title="Click to toggle availability on website"
                              >
                                <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                {isAvail ? 'In Stock' : 'Sold Out'}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setViewingItem(item)}
                                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                  title="View full details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="p-2 rounded-lg bg-[#e8a33d]/10 hover:bg-[#e8a33d]/20 text-[#e8a33d] transition-colors"
                                  title="Edit dish"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingItemId(item.id)}
                                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                  title="Delete dish"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* -------------------- BOOKINGS TAB -------------------- */}
            {activeTab === 'bookings' && (
              <motion.div
                key="bookings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Table Reservations</h2>
                    <p className="text-xs text-white/60">Live guest bookings and pre-orders received via website</p>
                  </div>
                  <span className="text-xs font-bold text-[#e8a33d] bg-[#e8a33d]/15 px-3 py-1.5 rounded-full border border-[#e8a33d]/20">
                    {bookings.length} Total Bookings
                  </span>
                </div>

                <div className="bg-[#120f0d] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
                  {bookings.length === 0 ? (
                    <div className="p-12 text-center text-white/40 flex flex-col items-center justify-center gap-3">
                      <CalendarDays className="w-8 h-8 text-[#e8a33d]/60" />
                      <p>No table reservations recorded in the system yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {bookings.map((b) => (
                        <div key={b.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-bold text-lg text-white">{b.name}</h3>
                              {b.reservationNumber && (
                                <span className="text-xs font-mono bg-white/10 text-white/80 px-2 py-0.5 rounded-md border border-white/10 font-semibold">
                                  {b.reservationNumber}
                                </span>
                              )}
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                                (b.status || '').toLowerCase() === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                (b.status || '').toLowerCase() === 'cancelled' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {b.status || 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-white/60">{b.email} • {b.phone}</p>
                            <p className="text-xs text-[#e8a33d] font-semibold flex items-center gap-2">
                              <span>📅 {b.date}</span>
                              <span>⏰ {b.time}</span>
                              <span>👥 {b.guests} Guests</span>
                            </p>
                            
                            {/* Pre-ordered items display */}
                            {b.preOrders && b.preOrders.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-white/5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#e8a33d] block mb-1">
                                  Pre-Ordered Delicacies:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {b.preOrders.map((po: any, idx: number) => (
                                    <span key={idx} className="bg-white/5 border border-white/10 text-white/80 text-xs px-2.5 py-1 rounded-lg">
                                      {po.menuItem?.name || 'Dish'} × {po.quantity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setViewingReceiptBooking(b)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors"
                              title="View Google Drive formatted text receipt"
                            >
                              <FileText className="w-4 h-4 text-[#e8a33d]" /> Receipt .txt
                            </button>
                            {(b.status || '').toLowerCase() !== 'confirmed' && (
                              <button 
                                onClick={() => updateBookingStatus(b.id, 'confirmed')} 
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-bold border border-emerald-500/20 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" /> Confirm
                              </button>
                            )}
                            {(b.status || '').toLowerCase() !== 'cancelled' && (
                              <button 
                                onClick={() => updateBookingStatus(b.id, 'cancelled')} 
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold border border-rose-500/20 transition-colors"
                              >
                                <XCircle className="w-4 h-4" /> Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* -------------------- REELS TAB -------------------- */}
            {activeTab === 'reels' && (
              <motion.div
                key="reels-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Header & Quick Action */}
                <div className="bg-[#120f0d] p-5 sm:p-6 rounded-3xl border border-[#e8a33d]/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-white">Social Reels & Video Spotlight</h2>
                      <span className="text-xs bg-[#e8a33d]/15 text-[#e8a33d] font-bold px-2.5 py-0.5 rounded-full border border-[#e8a33d]/20">
                        {reels.length} Active Reels
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Add Instagram Reels, YouTube Shorts, TikToks, or direct MP4 videos. The website automatically adapts the aspect ratio and auto-cycles through stories.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSeedDefaultReels}
                      disabled={isSeedingReels}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 text-[#e8a33d] ${isSeedingReels ? 'animate-spin' : ''}`} />
                      Load 4 Bagichi Reels
                    </button>
                  </div>
                </div>

                {/* Main 2-Column: Form on Left, Live Auto-Aspect Ratio Preview on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Form */}
                  <div className="lg:col-span-7 space-y-6">
                    <form onSubmit={handleAddReel} className="bg-[#120f0d] p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-[#e8a33d] font-bold flex items-center gap-1.5">
                          <Plus className="w-4 h-4" /> Add Social Video
                        </span>
                        {newReel.url && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Detected: {parseSocialVideoUrl(newReel.url, newReel.aspectRatio).platform.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Video URL Input */}
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <button 
                            type="button"
                            onClick={() => setUploadMethod('link')}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl border ${uploadMethod === 'link' ? 'bg-[#e8a33d] text-black border-[#e8a33d]' : 'bg-transparent text-white/60 border-white/10 hover:border-white/30'}`}
                          >
                            Use Video Link
                          </button>
                          <button 
                            type="button"
                            onClick={() => setUploadMethod('file')}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl border ${uploadMethod === 'file' ? 'bg-[#e8a33d] text-black border-[#e8a33d]' : 'bg-transparent text-white/60 border-white/10 hover:border-white/30'}`}
                          >
                            Upload Video File
                          </button>
                        </div>
                        
                        {uploadMethod === 'link' ? (
                          <>
                            <label className="block text-xs font-semibold text-white/80 mb-1.5">
                              Social Media / Video URL *
                            </label>
                            <input 
                              value={newReel.url} 
                              onChange={e => setNewReel({...newReel, url: e.target.value})} 
                              placeholder="Instagram Reel, YouTube Short/Video, TikTok, or MP4 link..." 
                              className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#e8a33d]" 
                            />
                            <p className="text-[11px] text-white/40 mt-2">
                              Supports Instagram Reels, YouTube Shorts, TikTok, Facebook, and direct .mp4 video files.
                            </p>
                          </>
                        ) : (
                          <>
                            <label className="block text-xs font-semibold text-white/80 mb-1.5">
                              Select Video File *
                            </label>
                            <div className="relative cursor-pointer group w-full overflow-hidden">
                              <input 
                                type="file" 
                                accept="video/mp4,video/webm,video/quicktime"
                                onChange={handleFileSelection}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                              />
                              <div className="relative z-10 w-full border border-dashed border-white/20 rounded-xl px-4 py-6 text-center hover:border-[#e8a33d]/50 transition-colors bg-white/5">
                                {selectedFile ? (
                                  <div className="relative z-10">
                                    <Check className="w-6 h-6 mx-auto mb-2 text-[#e8a33d]" />
                                    <span className="text-xs text-[#e8a33d] font-bold block truncate px-2">
                                      {selectedFile.name}
                                    </span>
                                    <span className="text-[10px] text-white/50 block mt-1">Ready to publish</span>
                                  </div>
                                ) : (
                                  <div className="relative z-10">
                                    <UploadCloud className="w-6 h-6 mx-auto mb-2 text-white/60 group-hover:text-[#e8a33d]" />
                                    <span className="text-xs text-white/80 font-medium block">
                                      Click to browse or drag and drop MP4, MOV, WEBM
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Quick Inspiration Clips */}
                      <div>
                        <span className="text-[11px] font-semibold text-white/50 block mb-2">
                          Quick Presets & Inspiration:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SAMPLE_RESTAURANT_REELS.map((sample, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setNewReel({
                                url: sample.videoUrl || sample.url,
                                caption: sample.caption,
                                title: sample.title,
                                aspectRatio: '9:16',
                                authorHandle: sample.authorHandle
                              })}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#e8a33d] border border-white/5 transition-all text-left truncate max-w-[200px]"
                            >
                              + {sample.title}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title & Author Handle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-white/80 mb-1.5">Reel Title / Highlight</label>
                          <input 
                            value={newReel.title} 
                            onChange={e => setNewReel({...newReel, title: e.target.value})} 
                            placeholder="e.g. Sizzling Tandoor Nights" 
                            className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-white/80 mb-1.5">Author Handle</label>
                          <input 
                            value={newReel.authorHandle} 
                            onChange={e => setNewReel({...newReel, authorHandle: e.target.value})} 
                            placeholder="@thebagichigarden" 
                            className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]" 
                          />
                        </div>
                      </div>

                      {/* Aspect Ratio Adjustment Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-white/80 mb-1.5">
                            Aspect Ratio Mode
                          </label>
                          <select
                            value={newReel.aspectRatio}
                            onChange={e => setNewReel({...newReel, aspectRatio: e.target.value})}
                            className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                          >
                            <option value="auto">✨ Auto Detect (Adaptive)</option>
                            <option value="9:16">📱 9:16 Vertical Reel / Story</option>
                            <option value="16:9">🖥️ 16:9 Landscape Widescreen</option>
                            <option value="1:1">🔲 1:1 Square</option>
                            <option value="4:5">🖼️ 4:5 Portrait</option>
                          </select>
                        </div>

                      </div>

                      {/* Caption */}
                      <div>
                        <label className="block text-xs font-semibold text-white/80 mb-1.5">Caption & Guest Experience *</label>
                        <textarea 
                          value={newReel.caption} 
                          onChange={e => setNewReel({...newReel, caption: e.target.value})} 
                          placeholder="Describe the experience..." 
                          className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d] min-h-[90px]" 
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={uploadMethod === 'link' ? !newReel.url.trim() : !selectedFile} 
                        className="relative overflow-hidden w-full py-3.5 bg-[#e8a33d] text-black rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#f3b55c] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e8a33d]/20 disabled:opacity-50"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Publish Reel to Website
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Live Responsive Aspect-Ratio Phone Preview */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="w-full max-w-[320px] space-y-3">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-[#e8a33d]" /> Live Auto-Adjusted Preview
                        </span>
                        <span className="font-mono text-[10px] text-[#e8a33d] bg-[#e8a33d]/10 px-2 py-0.5 rounded-full border border-[#e8a33d]/20">
                          {newReel.aspectRatio === 'auto' ? '9:16 Adaptive' : newReel.aspectRatio}
                        </span>
                      </div>

                      {/* Phone Frame */}
                      <div className="relative aspect-[9/16] w-full rounded-3xl overflow-hidden bg-black border-2 border-white/20 shadow-2xl flex flex-col justify-between p-3">
                        {debouncedReelUrl ? (
                          (() => {
                            const parsed = parseSocialVideoUrl(debouncedReelUrl, newReel.aspectRatio);
                            return (
                              <>
                                {/* Background Ambient Blur */}
                                <div
                                  className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-40 pointer-events-none scale-125"
                                  style={{
                                    backgroundImage: `url(${parsed.thumbnailUrl})`
                                  }}
                                />

                                {/* Video Area */}
                                <div className="w-full h-full relative z-10 flex items-center justify-center overflow-hidden rounded-2xl">
                                  {parsed.isDirectVideo ? (
                                    <video
                                      src={parsed.embedUrl}
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                  ) : parsed.platform === 'youtube' ? (
                                    <iframe
                                      src={parsed.embedUrl}
                                      title="Preview"
                                      className="w-full h-full border-0"
                                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                  ) : parsed.platform === 'instagram' ? (
                                    <iframe
                                      src={parsed.embedUrl}
                                      title="Instagram Preview"
                                      className="w-full h-full border-0"
                                    />
                                  ) : (
                                    <img
                                      src={parsed.thumbnailUrl}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>

                                {/* Overlaid Preview Badge */}
                                <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
                                  <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/15">
                                    {newReel.authorHandle || '@thebagichi'}
                                  </span>
                                  <span className="bg-[#e8a33d] text-black font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
                                    Live Test
                                  </span>
                                </div>

                                {/* Bottom Info Overlay */}
                                <div className="absolute bottom-4 left-4 right-4 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 rounded-2xl">
                                  <h4 className="text-xs font-bold text-white line-clamp-1">{newReel.title || 'Highlight Preview'}</h4>
                                  <p className="text-[11px] text-white/70 line-clamp-2 mt-0.5">{newReel.caption || 'Caption text will appear here...'}</p>
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 text-white/30 space-y-3">
                            <Video className="w-10 h-10 text-white/20" />
                            <p className="text-xs leading-[2.2]">
                              Enter a video URL on the left to see live real-time auto-aspect ratio playback.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Active Reels Grid */}
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">Active Social Reels ({reels.length})</h3>
                      <p className="text-xs text-white/60">Currently broadcasting on customer homepage with auto-advance carousel.</p>
                    </div>
                  </div>

                  {reels.length === 0 ? (
                    <div className="p-12 text-center bg-[#120f0d] rounded-3xl border border-white/5 space-y-3">
                      <Film className="w-10 h-10 text-[#e8a33d]/40 mx-auto animate-pulse" />
                      <h4 className="text-base font-bold text-white">No reels published yet</h4>
                      <p className="text-xs text-white/50 max-w-sm mx-auto">
                        Add a social reel above or click below to load official Bagichi restaurant video clips.
                      </p>
                      <button
                        onClick={handleSeedDefaultReels}
                        disabled={isSeedingReels}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8a33d] text-black text-xs font-bold hover:bg-[#f3b55c] transition-all"
                      >
                        <RefreshCw className="w-4 h-4" /> Load 4 Sample Reels
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {reels.map((reel) => {
                        const parsed = parseSocialVideoUrl(reel.videoUrl || reel.url, reel.aspectRatio);
                        const reelComments = comments.filter(c => c.reelId === reel.id);
                        return (
                          <div
                            key={reel.id}
                            className="bg-[#120f0d] rounded-3xl border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between group hover:border-[#e8a33d]/40 transition-all relative"
                          >
                            {/* Video / Thumbnail Container */}
                            <div className="aspect-[9/16] bg-black relative flex items-center justify-center overflow-hidden">
                              <img
                                src={reel.thumbnailUrl || parsed.thumbnailUrl}
                                alt={reel.title || 'Reel'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

                              {/* Play Test Button */}
                              <button
                                onClick={() => setPreviewModalReel(reel)}
                                className="absolute inset-0 flex items-center justify-center z-10 group/btn"
                                title="Play Reel in Modal"
                              >
                                <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[#e8a33d] flex items-center justify-center group-hover/btn:scale-110 group-hover/btn:bg-[#e8a33d] group-hover/btn:text-black transition-all shadow-xl">
                                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                                </div>
                              </button>

                              {/* Top Badges */}
                              <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
                                <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/15 flex items-center gap-1.5 uppercase">
                                  <Camera className="w-3 h-3 text-[#e8a33d]" />
                                  {parsed.platform}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setReelStatsModal(reel)}
                                    className="px-2.5 py-1 rounded-full bg-[#e8a33d]/20 hover:bg-[#e8a33d] text-[#e8a33d] hover:text-black flex items-center gap-1 text-[10px] font-bold transition-all border border-[#e8a33d]/30"
                                    title="View Likes & Viewers"
                                  >
                                    <BarChart2 className="w-3 h-3" /> Stats
                                  </button>
                                  <button
                                    onClick={() => setDeletingReelId(reel.id)}
                                    className="w-7 h-7 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-lg"
                                    title="Delete Reel"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingReel(reel)}
                                    className="w-7 h-7 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-lg"
                                    title="Edit Reel"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                  </button>

                                </div>
                              </div>

                              {/* Stats Ribbon */}
                              <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
                                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-white/90">
                                  <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-[#e8a33d]" /> {reel.views || 0}</span>
                                  <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400 fill-rose-400/50" /> {reel.likes || 0}</span>
                                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" /> {reelComments.length}</span>
                                </div>
                                <span className="text-[9px] font-mono font-bold bg-black/80 text-[#e8a33d] px-2 py-0.5 rounded-md border border-[#e8a33d]/20">
                                  {reel.aspectRatio || '9:16'}
                                </span>
                              </div>
                            </div>

                            {/* Caption & Controls */}
                            <div className="p-4 space-y-3">
                              <div>
                                <h4 className="text-sm font-bold text-white line-clamp-1">{reel.title || 'Bagichi Moments'}</h4>
                                <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mt-0.5">{reel.caption}</p>
                              </div>
                              
                              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50">
                                <span>{reel.authorHandle || '@thebagichigarden'}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedCommentReelFilter(reel.id);
                                      setActiveTab('comments');
                                    }}
                                    className="text-xs text-[#e8a33d] hover:underline font-semibold flex items-center gap-1"
                                  >
                                    <MessageSquare className="w-3 h-3" /> Moderation
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* -------------------- TAB: COMMENTS MODERATION -------------------- */}
            {activeTab === 'comments' && (
              <motion.div
                key="comments-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Header & Filter Controls */}
                <div className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Reel Comments Moderation</h2>
                      <span className="bg-[#e8a33d]/20 text-[#e8a33d] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#e8a33d]/30">
                        Admin Exclusive
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      Pin customer feedback to the top, like comments with an official Admin Badge, edit or delete inappropriate remarks.
                    </p>
                  </div>

                  {/* Reel Selector Filter */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#080706] border border-white/10 px-3 py-2 rounded-xl text-xs">
                      <Filter className="w-3.5 h-3.5 text-[#e8a33d]" />
                      <select
                        value={selectedCommentReelFilter}
                        onChange={(e) => setSelectedCommentReelFilter(e.target.value)}
                        className="bg-transparent text-white focus:outline-none text-xs cursor-pointer"
                      >
                        <option value="all" className="bg-[#120f0d] text-white">All Reels ({comments.length} comments)</option>
                        {reels.map(r => (
                          <option key={r.id} value={r.id} className="bg-[#120f0d] text-white">
                            {r.title || 'Reel ' + r.id.substring(0, 5)} ({comments.filter(c => c.reelId === r.id).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                {(() => {
                  const filteredComments = selectedCommentReelFilter === 'all' 
                    ? comments 
                    : comments.filter(c => c.reelId === selectedCommentReelFilter);

                  // Sort pinned comments first
                  const sortedComments = [...filteredComments].sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return 0;
                  });

                  if (sortedComments.length === 0) {
                    return (
                      <div className="p-16 text-center bg-[#120f0d] rounded-3xl border border-white/5 space-y-3">
                        <MessageCircle className="w-12 h-12 text-[#e8a33d]/30 mx-auto" />
                        <h4 className="text-base font-bold text-white">No comments found</h4>
                        <p className="text-xs text-white/50 max-w-sm mx-auto">
                          {selectedCommentReelFilter === 'all' 
                            ? "Customers haven't submitted any comments on video reels yet."
                            : "No comments on this specific reel yet."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {sortedComments.map((comment) => {
                        const targetReel = reels.find(r => r.id === comment.reelId);
                        return (
                          <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-5 rounded-2xl border transition-all ${
                              comment.isPinned 
                                ? 'bg-[#18130d] border-[#e8a33d]/60 shadow-lg shadow-[#e8a33d]/5' 
                                : 'bg-[#120f0d] border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              {/* Comment Content */}
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#e8a33d]/20 text-[#e8a33d] font-bold text-xs flex items-center justify-center border border-[#e8a33d]/30">
                                    {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'G'}
                                  </div>
                                  <span className="font-bold text-sm text-white">{comment.authorName || 'Guest Visitor'}</span>

                                  {comment.isPinned && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#e8a33d] text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      <Pin className="w-3 h-3 fill-current" /> Pinned to Top
                                    </span>
                                  )}

                                  {comment.adminLiked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                      <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> Liked by Bagichi Admin
                                    </span>
                                  )}

                                  {comment.isEdited && (
                                    <span className="text-[10px] text-white/40 italic">(edited)</span>
                                  )}

                                  <span className="text-xs text-white/40 ml-auto sm:ml-0">
                                    {targetReel ? `on "${targetReel.title || 'Reel'}"` : ''}
                                  </span>
                                </div>

                                <p className="text-sm text-white/80 leading-relaxed pl-9">
                                  {comment.text}
                                </p>
                              </div>

                              {/* Admin Action Buttons */}
                              <div className="flex items-center gap-2 self-end sm:self-start pt-2 sm:pt-0 pl-9 sm:pl-0">
                                {/* Pin Button */}
                                <button
                                  onClick={() => handleTogglePinComment(comment)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                                    comment.isPinned
                                      ? 'bg-[#e8a33d] text-black border-[#e8a33d] shadow-md shadow-[#e8a33d]/20'
                                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
                                  }`}
                                  title={comment.isPinned ? "Unpin comment" : "Pin comment to top of reel"}
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span>{comment.isPinned ? 'Pinned' : 'Pin Top'}</span>
                                </button>

                                {/* Like Button */}
                                <button
                                  onClick={() => handleToggleAdminLikeComment(comment)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                                    comment.adminLiked
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-rose-300 border-white/10'
                                  }`}
                                  title="Like comment as Restaurant Admin"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${comment.adminLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                  <span>{comment.adminLiked ? 'Liked' : 'Like'}</span>
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => handleOpenEditComment(comment)}
                                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                                  title="Edit comment text"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => setDeletingCommentId(comment.id)}
                                  className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-colors"
                                  title="Delete comment permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* -------------------- TAB: GUEST REVIEWS -------------------- */}
            {activeTab === 'reviews' && (
              <motion.div
                key="reviews-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="bg-[#120f0d] p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Guest Reviews & Ratings</h2>
                      <span className="bg-[#e8a33d]/20 text-[#e8a33d] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#e8a33d]/30">
                        Ranked by Stars
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      Customer feedback sorted with 5-star reviews at the top, followed by lower ratings for easy quality monitoring.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-[#080706] border border-white/10 px-4 py-2.5 rounded-2xl">
                    <div className="text-center">
                      <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Total</span>
                      <p className="text-lg font-bold text-white">{reviews.length}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="text-center">
                      <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Average</span>
                      <p className="text-lg font-bold text-[#e8a33d]">
                        {reviews.length > 0
                          ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
                          : '5.0'} ★
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reviews Grid / List */}
                {(() => {
                  const sortedReviews = [...reviews].sort((a, b) => (b.rating || 5) - (a.rating || 5));

                  if (sortedReviews.length === 0) {
                    return (
                      <div className="p-16 text-center bg-[#120f0d] rounded-3xl border border-white/5 space-y-3">
                        <Star className="w-12 h-12 text-[#e8a33d]/30 mx-auto" />
                        <h4 className="text-base font-bold text-white">No reviews submitted yet</h4>
                        <p className="text-xs text-white/50 max-w-sm mx-auto">
                          Customer reviews submitted on the public website will show here sorted by star rating.
                        </p>
                        <button onClick={handleSeedDefaultReviews} disabled={isSeedingReviews} className="mt-4 px-4 py-2 bg-[#e8a33d] text-black font-bold text-xs rounded-xl">
                          {isSeedingReviews ? 'Loading...' : 'Load Default Reviews'}
                        </button>

                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedReviews.map((review) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#120f0d] border border-white/10 hover:border-white/20 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#e8a33d]/15 text-[#e8a33d] font-bold text-sm flex items-center justify-center border border-[#e8a33d]/30">
                                  {(review.authorName || review.name || 'G').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-bold text-white text-sm">{review.authorName || review.name || 'Guest Diner'}</h4>
                                  <span className="text-[11px] text-white/40">{review.role || 'Guest Diner'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 bg-[#080706] px-2.5 py-1 rounded-xl border border-white/10">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < (review.rating || 5)
                                        ? 'text-[#e8a33d] fill-[#e8a33d]'
                                        : 'text-white/20'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <p className="text-xs text-white/80 leading-relaxed italic bg-[#080706]/60 p-3 rounded-xl border border-white/5">
                              "{review.comment}"
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-white/40">
                            <span>Rating: {review.rating || 5} Stars</span>
                            <button
                              onClick={() => setDeletingReviewId(review.id)}
                              className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* -------------------- KITCHEN DISPLAY (KDS & POS) TAB -------------------- */}
            {activeTab === 'kds' && (
              <motion.div
                key="kds-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <KitchenDisplaySystem isAdminView={true} />
              </motion.div>
            )}

            {/* -------------------- GOOGLE DRIVE DATABASE TAB -------------------- */}
            {activeTab === 'drive' && (
              <motion.div
                key="drive-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <GoogleDriveManager
                  bookings={bookings}
                  menuItems={menuItems}
                  reviews={reviews}
                  reels={reels}
                  comments={comments}
                  isAdminView={true}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* -------------------- BOOKING TEXT RECEIPT MODAL -------------------- */}
      <AnimatePresence>
        {viewingReceiptBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#120f0d] border border-[#e8a33d]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 bg-[#171412] border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#e8a33d]/15 border border-[#e8a33d]/30 flex items-center justify-center text-[#e8a33d]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-white font-mono font-medium text-sm">
                      Booking_{viewingReceiptBooking.reservationNumber || viewingReceiptBooking.id}.txt
                    </h4>
                    <p className="text-[11px] text-white/50">Google Drive Structured Database Record</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const text = formatBookingReceiptText(viewingReceiptBooking);
                      navigator.clipboard.writeText(text);
                      showNotification('Copied receipt text to clipboard!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-[#e8a33d]" />
                    <span>Copy Text</span>
                  </button>
                  <button
                    onClick={() => {
                      const text = formatBookingReceiptText(viewingReceiptBooking);
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Booking_${viewingReceiptBooking.reservationNumber || 'Receipt'}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setViewingReceiptBooking(null)}
                    className="p-1.5 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-white/90 leading-relaxed bg-[#080706]">
                <pre className="whitespace-pre-wrap select-text selection:bg-[#e8a33d] selection:text-black">
                  {formatBookingReceiptText(viewingReceiptBooking)}
                </pre>
              </div>

              <div className="px-6 py-3 bg-[#171412] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Google Drive Formatted Record</span>
                <button
                  onClick={() => setViewingReceiptBooking(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- ADD MENU ITEM MODAL -------------------- */}
      <AnimatePresence>
        {isAddMenuOpen && (
          <motion.div 
            key="add-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#120f0d] rounded-3xl border border-[#e8a33d]/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative my-8"
            >
              <button
                onClick={() => setIsAddMenuOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <span className="text-[10px] uppercase tracking-widest text-[#e8a33d] font-bold">New Culinary Entry</span>
                <h3 className="text-2xl font-bold text-white mt-1">Add Dish to Menu</h3>
                <p className="text-xs text-white/60">This dish will immediately appear on the public menu for customers.</p>
              </div>

              <form onSubmit={handleAddMenu} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Dish Name *</label>
                    <input
                      required
                      placeholder="e.g. Saffron Malai Kofta"
                      value={newMenu.name}
                      onChange={e => setNewMenu({...newMenu, name: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Category *</label>
                    <select
                      value={newMenu.category}
                      onChange={e => setNewMenu({...newMenu, category: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    >
                      {PRESET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Custom">+ Custom Category...</option>
                    </select>
                  </div>
                </div>

                {newMenu.category === 'Custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#e8a33d] mb-1.5">Custom Category Name *</label>
                    <input
                      required
                      placeholder="e.g. Clay Oven Breads, Sizzlers, Soups"
                      value={newMenu.customCategory}
                      onChange={e => setNewMenu({...newMenu, customCategory: e.target.value})}
                      className="w-full bg-[#080706] border border-[#e8a33d]/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Price in INR (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 350"
                      value={newMenu.price}
                      onChange={e => setNewMenu({...newMenu, price: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Dietary / Tag</label>
                    <select
                      value={newMenu.dietary}
                      onChange={e => setNewMenu({...newMenu, dietary: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    >
                      <option value="Vegetarian">🌱 Vegetarian</option>
                      <option value="Vegan">🌿 Pure Vegan</option>
                      <option value="Jain Friendly">✨ Jain Friendly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Description & Ingredients *</label>
                  <textarea
                    required
                    placeholder="Describe textures, key spices, or serving style..."
                    value={newMenu.description}
                    onChange={e => setNewMenu({...newMenu, description: e.target.value})}
                    className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d] min-h-[75px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Photo Image URL</label>
                  <input
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newMenu.imageUrl}
                    onChange={e => setNewMenu({...newMenu, imageUrl: e.target.value})}
                    className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                  />
                  
                  {/* Image quick picker suggestions */}
                  <div className="mt-2">
                    <span className="text-[10px] text-white/50 block mb-1">Or pick a suggested image:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_IMAGES.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewMenu({...newMenu, imageUrl: img.url})}
                          className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                            newMenu.imageUrl === img.url 
                              ? 'bg-[#e8a33d] text-black border-[#e8a33d] font-bold' 
                              : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                          }`}
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Special Tags / Flags */}
                <div className="bg-[#080706] p-4 rounded-xl border border-white/5 flex flex-wrap gap-6 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={newMenu.isChefSpecial}
                      onChange={e => setNewMenu({...newMenu, isChefSpecial: e.target.checked})}
                      className="w-4 h-4 accent-[#e8a33d] rounded"
                    />
                    <span className="flex items-center gap-1 font-medium"><Sparkles className="w-3.5 h-3.5 text-[#e8a33d]" /> Chef's Special</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={newMenu.isSpicy}
                      onChange={e => setNewMenu({...newMenu, isSpicy: e.target.checked})}
                      className="w-4 h-4 accent-rose-500 rounded"
                    />
                    <span className="flex items-center gap-1 font-medium"><Flame className="w-3.5 h-3.5 text-rose-400" /> Spicy Item</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={newMenu.isAvailable}
                      onChange={e => setNewMenu({...newMenu, isAvailable: e.target.checked})}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="font-medium text-emerald-400">Available In Stock</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddMenuOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#e8a33d]/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Publish Dish</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- EDIT MENU ITEM MODAL -------------------- */}
      <AnimatePresence>
        {editingItem && (
          <motion.div 
            key="edit-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#120f0d] rounded-3xl border border-[#e8a33d]/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative my-8"
            >
              <button
                onClick={() => setEditingItem(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <span className="text-[10px] uppercase tracking-widest text-[#e8a33d] font-bold">Edit Dish</span>
                <h3 className="text-2xl font-bold text-white mt-1">Modify Menu Item</h3>
                <p className="text-xs text-white/60">Update details for "{editingItem.name}".</p>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Dish Name *</label>
                    <input
                      required
                      value={editFormData.name}
                      onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Category *</label>
                    <select
                      value={editFormData.category}
                      onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    >
                      {PRESET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Custom">+ Custom Category...</option>
                    </select>
                  </div>
                </div>

                {editFormData.category === 'Custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#e8a33d] mb-1.5">Custom Category Name *</label>
                    <input
                      required
                      placeholder="e.g. Clay Oven Breads, Sizzlers, Soups"
                      value={editFormData.customCategory}
                      onChange={e => setEditFormData({...editFormData, customCategory: e.target.value})}
                      className="w-full bg-[#080706] border border-[#e8a33d]/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Price in INR (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editFormData.price}
                      onChange={e => setEditFormData({...editFormData, price: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5">Dietary / Tag</label>
                    <select
                      value={editFormData.dietary}
                      onChange={e => setEditFormData({...editFormData, dietary: e.target.value})}
                      className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                    >
                      <option value="Vegetarian">🌱 Vegetarian</option>
                      <option value="Vegan">🌿 Pure Vegan</option>
                      <option value="Jain Friendly">✨ Jain Friendly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Description & Ingredients *</label>
                  <textarea
                    required
                    value={editFormData.description}
                    onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d] min-h-[75px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Photo Image URL</label>
                  <input
                    value={editFormData.imageUrl}
                    onChange={e => setEditFormData({...editFormData, imageUrl: e.target.value})}
                    className="w-full bg-[#080706] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#e8a33d]"
                  />

                  {/* Image quick picker suggestions */}
                  <div className="mt-2">
                    <span className="text-[10px] text-white/50 block mb-1">Or pick a suggested image:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_IMAGES.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditFormData({...editFormData, imageUrl: img.url})}
                          className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                            editFormData.imageUrl === img.url 
                              ? 'bg-[#e8a33d] text-black border-[#e8a33d] font-bold' 
                              : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                          }`}
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Special Tags / Flags */}
                <div className="bg-[#080706] p-4 rounded-xl border border-white/5 flex flex-wrap gap-6 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={editFormData.isChefSpecial}
                      onChange={e => setEditFormData({...editFormData, isChefSpecial: e.target.checked})}
                      className="w-4 h-4 accent-[#e8a33d] rounded"
                    />
                    <span className="flex items-center gap-1 font-medium"><Sparkles className="w-3.5 h-3.5 text-[#e8a33d]" /> Chef's Special</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={editFormData.isSpicy}
                      onChange={e => setEditFormData({...editFormData, isSpicy: e.target.checked})}
                      className="w-4 h-4 accent-rose-500 rounded"
                    />
                    <span className="flex items-center gap-1 font-medium"><Flame className="w-3.5 h-3.5 text-rose-400" /> Spicy Item</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={editFormData.isAvailable}
                      onChange={e => setEditFormData({...editFormData, isAvailable: e.target.checked})}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="font-medium text-emerald-400">Available In Stock</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#e8a33d]/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- VIEW MENU ITEM DETAILS MODAL -------------------- */}
      <AnimatePresence>
        {viewingItem && (
          <motion.div 
            key="view-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120f0d] rounded-3xl border border-[#e8a33d]/30 w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => setViewingItem(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-56 relative bg-black">
                <img
                  src={viewingItem.imageUrl}
                  alt={viewingItem.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#120f0d] via-transparent to-black/40" />
                <span className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md text-[#e8a33d] font-bold text-lg px-4 py-1.5 rounded-full border border-white/10">
                  ₹{viewingItem.price}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-[#e8a33d]/15 text-[#e8a33d] px-2.5 py-0.5 rounded-full border border-[#e8a33d]/20">
                      {viewingItem.category}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                      viewingItem.isAvailable !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {viewingItem.isAvailable !== false ? 'In Stock' : 'Sold Out'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{viewingItem.name}</h3>
                </div>

                <p className="text-white/70 text-sm leading-[2.2]">
                  {viewingItem.description || 'Authentic dish prepared fresh by our garden master chefs.'}
                </p>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => {
                      const itm = viewingItem;
                      setViewingItem(null);
                      openEditModal(itm);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e8a33d] text-black text-xs font-bold hover:bg-[#f3b55c] transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit This Dish
                  </button>

                  <button
                    onClick={() => setViewingItem(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- DELETE CONFIRMATION DIALOG -------------------- */}
      <AnimatePresence>
        {deletingItemId && (
          <motion.div 
            key="delete-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120f0d] rounded-3xl border border-rose-500/30 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Menu Item?</h3>
              <p className="text-xs text-white/60 leading-[2.2]">
                Are you sure you want to permanently remove this dish from the menu? This action cannot be undone and will update the customer website immediately.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingItemId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMenu}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-500/20"
                >
                  Yes, Delete Dish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- REEL PLAY PREVIEW MODAL -------------------- */}
      <AnimatePresence>
        {previewModalReel && (
          <motion.div 
            key="reel-preview-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-[#e8a33d]/30 shadow-2xl flex flex-col justify-between"
            >
              <button
                onClick={() => setPreviewModalReel(null)}
                className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                {parseSocialVideoUrl(previewModalReel.videoUrl || previewModalReel.url).isDirectVideo || previewModalReel.videoUrl ? (
                  <video
                    src={previewModalReel.videoUrl || previewModalReel.url}
                    autoPlay
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <iframe
                    src={parseSocialVideoUrl(previewModalReel.videoUrl || previewModalReel.url).embedUrl}
                    title="Fullscreen Reel"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- REEL STATS & VIEWER LOGS MODAL -------------------- */}
      <AnimatePresence>
        {reelStatsModal && (
          <motion.div 
            key="reel-stats-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#120f0d] rounded-3xl border border-[#e8a33d]/30 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative my-8"
            >
              <button
                onClick={() => setReelStatsModal(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#e8a33d]">Analytics & Engagement</span>
                  <span className="bg-[#e8a33d]/15 text-[#e8a33d] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#e8a33d]/20">
                    Live Telemetry
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{reelStatsModal.title || 'Social Video Spotlight'}</h3>
                <p className="text-xs text-white/50">{reelStatsModal.authorHandle || '@thebagichigarden'}</p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#080706] p-4 rounded-2xl border border-white/10 text-center">
                  <Eye className="w-5 h-5 text-[#e8a33d] mx-auto mb-1" />
                  <span className="text-[10px] text-white/50 uppercase font-bold">Total Views</span>
                  <p className="text-xl font-bold text-white mt-0.5">{reelStatsModal.views || 0}</p>
                </div>
                <div className="bg-[#080706] p-4 rounded-2xl border border-white/10 text-center">
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-400 mx-auto mb-1" />
                  <span className="text-[10px] text-white/50 uppercase font-bold">Total Likes</span>
                  <p className="text-xl font-bold text-white mt-0.5">{reelStatsModal.likes || 0}</p>
                </div>
                <div className="bg-[#080706] p-4 rounded-2xl border border-white/10 text-center">
                  <MessageCircle className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <span className="text-[10px] text-white/50 uppercase font-bold">Comments</span>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {comments.filter(c => c.reelId === reelStatsModal.id).length}
                  </p>
                </div>
              </div>

              {/* Viewer & Like Activity Breakdown */}
              <div className="space-y-4">
                <div className="bg-[#080706] p-4 rounded-2xl border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#e8a33d]" /> Who Saw This Reel (Recent Impressions)
                  </h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {[
                      { viewer: 'Guest Diner (Mobile Safari - Jaipur)', time: 'Just now', watched: '100% full reel' },
                      { viewer: 'Guest Visitor (Chrome Web - Delhi)', time: '12 mins ago', watched: 'Completed' },
                      { viewer: 'Customer @ Bagichi Table 4 (iOS)', time: '34 mins ago', watched: '2 loops' },
                      { viewer: 'Food Explorer (Android App)', time: '1 hr ago', watched: 'Completed' },
                    ].map((log, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-white/80 font-medium">{log.viewer}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/40">
                          <span className="text-[#e8a33d]">{log.watched}</span>
                          <span>•</span>
                          <span>{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#080706] p-4 rounded-2xl border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-rose-400" /> Who Liked This Reel
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {[
                      { user: 'Rohit Sharma (Jaipur)', note: 'Tapped heart on Ambient Garden Video' },
                      { user: 'Pooja Verma (Ajmer)', note: 'Favorited Chef Special Reel' },
                      { user: 'Ananya Mehta', note: 'Liked & shared video spotlight' },
                    ].map((liker, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                          <span className="text-white/90 font-medium">{liker.user}</span>
                        </div>
                        <span className="text-[10px] text-white/40">{liker.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    const rId = reelStatsModal.id;
                    setReelStatsModal(null);
                    setSelectedCommentReelFilter(rId);
                    setActiveTab('comments');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#e8a33d] text-black text-xs font-bold hover:bg-[#f3b55c] transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" /> Moderate Comments ({comments.filter(c => c.reelId === reelStatsModal.id).length})
                </button>

                <button
                  onClick={() => setReelStatsModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- EDIT COMMENT MODAL -------------------- */}
      <AnimatePresence>
        {editingComment && (
          <motion.div 
            key="edit-comment-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120f0d] rounded-3xl border border-[#e8a33d]/30 max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Reel Comment</h3>
                  <p className="text-xs text-white/60">By {editingComment.authorName || 'Guest'}</p>
                </div>
                <button
                  onClick={() => setEditingComment(null)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Comment Text</label>
                <textarea
                  rows={4}
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  className="w-full bg-[#080706] border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-[#e8a33d] resize-none leading-relaxed"
                  placeholder="Enter updated comment text..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingComment(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditComment}
                  disabled={!editCommentText.trim()}
                  className="px-5 py-2 rounded-xl bg-[#e8a33d] hover:bg-[#f3b55c] text-black text-xs font-bold transition-colors shadow-lg disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- DELETE COMMENT CONFIRMATION -------------------- */}
      <AnimatePresence>
        {deletingCommentId && (
          <motion.div 
            key="delete-comment-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120f0d] rounded-3xl border border-rose-500/30 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Comment?</h3>
              <p className="text-xs text-white/60 leading-[2.2]">
                Are you sure you want to permanently delete this comment from the reel? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingCommentId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteComment(deletingCommentId)}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-500/20"
                >
                  Yes, Delete Comment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- DELETE REVIEW CONFIRMATION -------------------- */}
      <AnimatePresence>
        {deletingReviewId && (
          <motion.div 
            key="delete-review-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120f0d] rounded-3xl border border-rose-500/30 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Guest Review?</h3>
              <p className="text-xs text-white/60 leading-[2.2]">
                Are you sure you want to permanently remove this customer review from the public website?
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingReviewId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteReview(deletingReviewId)}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-500/20"
                >
                  Yes, Delete Review
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- REEL DELETE CONFIRMATION DIALOG -------------------- */}
      <AnimatePresence>
        {deletingReelId && (
          <motion.div 
            key="reel-delete-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#120f0d] rounded-3xl border border-rose-500/30 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Social Reel?</h3>
              <p className="text-xs text-white/60 leading-[2.2]">
                Are you sure you want to remove this video reel from the website spotlight? This action will immediately update the live customer homepage.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingReelId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteReel(deletingReelId)}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-500/20"
                >
                  Yes, Delete Reel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

