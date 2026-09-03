export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  name?: string;
  deviceToken?: string;
  role?: string;
  createdAt?: any;
  likes?: number;
}

export interface OrderItem {
  id: string;
  reservationId: string;
  menuItemId: string;
  quantity: number;
  menuItem: MenuItem;
}

export interface Reservation {
  id: string;
  reservationNumber: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  preOrders?: OrderItem[];
}

export interface SocialReel {
  id: string;
  url: string;
  caption: string;
  platform?: 'instagram' | 'youtube' | 'tiktok' | 'facebook' | 'direct' | 'other';
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5' | 'auto';
  title?: string;
  likes?: number;
  views?: number;
  likedUsers?: string[];
  viewedUsers?: string[];
  authorHandle?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt?: any;
}

export interface ReelComment {
  id: string;
  reelId: string;
  authorName: string;
  text: string;
  createdAt?: any;
  isPinned?: boolean;
  adminLiked?: boolean;
  likes?: number;
  likesCount?: number;
  isEdited?: boolean;
}

export type OrderStatus = 
  | 'PLACED'           // Customer placed order online or in restaurant
  | 'ACCEPTED'         // POS acknowledged & accepted
  | 'IN_PREPARATION'   // Kitchen Display active & KOT generated
  | 'FOOD_READY'       // Chefs finished cooking, ready for pickup/serving
  | 'DISPATCHED'       // Dispatched / Picked up / Served
  | 'CANCELLED';

export type ZomatoOrderStatus = OrderStatus;

export interface KitchenOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  customization?: string; // e.g. "Less Spicy", "Extra Gravy", "Jain prep"
  isCompletedInKitchen?: boolean;
}

export type ZomatoOrderItem = KitchenOrderItem;

export interface RestaurantOrder {
  id: string;
  orderNumber: string;         // e.g. BAG-8942
  kotNumber?: string;          // e.g. KOT-042
  channel: 'ONLINE_DELIVERY' | 'TAKEAWAY' | 'DINE_IN' | 'DIRECT_TAKEOUT' | 'ZOMATO' | 'SWIGGY';
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  locationCoordinates?: { lat: number; lng: number }; // GPS / Google Map coordinates
  mapsLink?: string;          // Direct Google Maps pin URL
  landmark?: string;          // Optional landmark
  houseDetails?: string;      // Optional flat / house number
  alternatePhone?: string;    // Optional alternate mobile
  tableNumber?: string;
  cookingInstructions?: string; // e.g. "Do not add onions, extra green chutney"
  riderName?: string;
  riderPhone?: string;
  riderEtaMinutes?: number;
  items: KitchenOrderItem[];
  totalAmount: number;
  taxAmount?: number;
  status: OrderStatus;
  prepTimeMinutes: number;
  kotPrinted: boolean;
  kotPrintedAt?: string;
  createdAt: any;
  updatedAt?: any;
  foodReadyAt?: string;
  dispatchedAt?: string;
  kotDrivePdfUrl?: string;
  kotDriveFileId?: string;
  kotSavedToDriveAt?: string;
  paymentMethod?: 'COD' | 'ONLINE' | 'UPI';
  paymentStatus?: 'PENDING' | 'PAID';
}

export type ZomatoOrder = RestaurantOrder;


