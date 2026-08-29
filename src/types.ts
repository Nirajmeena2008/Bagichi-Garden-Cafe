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
