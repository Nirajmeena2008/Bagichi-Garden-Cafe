import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const menuItems = [
  { name: "Garlic Cheese Paneer Tikka", description: "Soft paneer cubes marinated with garlic and cheese, roasted in tandoor.", price: 350, category: "Starters", imageUrl: "https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&q=80&w=800" },
  { name: "Veg Spring Roll", description: "Crispy fried rolls stuffed with fresh vegetables.", price: 260, category: "Starters", imageUrl: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=800" },
  { name: "Masala Cheese Nachos", description: "Crispy nachos topped with spicy masala and melted cheese.", price: 250, category: "Starters", imageUrl: "https://images.unsplash.com/photo-1582169505937-b9992bd01ed9?auto=format&fit=crop&q=80&w=800" },
  { name: "Dal Makhani", description: "Slow-cooked black lentils in a rich, creamy tomato gravy.", price: 330, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800" },
  { name: "Paneer Lababdar", description: "Paneer cubes cooked in a luscious, spiced tomato and onion gravy.", price: 360, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800" },
  { name: "Mix Vegetable", description: "Assorted seasonal vegetables cooked in Indian spices.", price: 280, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800" },
  { name: "Dum Biryani", description: "Aromatic basmati rice cooked with mixed vegetables and rich spices.", price: 310, category: "Main Course", imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=800" },
  { name: "Pink Sauce Pasta", description: "Penne pasta tossed in a creamy and tangy tomato-cream sauce.", price: 380, category: "Italian", imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&q=80&w=800" },
  { name: "Arrabbiata Pasta", description: "Spicy tomato sauce pasta with garlic and red chili flakes.", price: 350, category: "Italian", imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800" },
  { name: "Hot Sizzling Brownie", description: "Warm chocolate brownie served on a sizzler plate with vanilla ice cream.", price: 250, category: "Desserts & Beverages", imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800" },
  { name: "Cold Coffee", description: "Classic cold coffee blended to perfection.", price: 200, category: "Desserts & Beverages", imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800" },
  { name: "Lemon Iced Tea", description: "Refreshing iced tea infused with fresh lemon.", price: 200, category: "Desserts & Beverages", imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800" },
];

const reviews = [
  { rating: 5, authorName: "Lav P.", comment: "Lush green garden, spacious restaurant, delicious food will make your experience unforgettable. Good option for lunch and caters to big groups with ease." },
  { rating: 5, authorName: "Afreen R.", comment: "Ambience and cleanliness was very good. Food top notch. Special mention to Mr. Karan who was the server." },
  { rating: 5, authorName: "Wanderlog Reviewer", comment: "A truly delightful dining experience. The ambiance is charming, with lovely lighting and comfortable seating." },
];

async function main() {
  console.log("Seeding menu items...");
  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  console.log("Seeding reviews...");
  for (const review of reviews) {
    await prisma.review.create({ data: review });
  }
}

main()
  .then(() => {
    console.log("Seed successful");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
