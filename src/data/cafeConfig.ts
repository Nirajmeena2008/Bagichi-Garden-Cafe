/**
 * Cafe & Restaurant Template Configuration
 * 
 * Customize this single configuration file to adapt this template
 * to any cafe, bistro, cloud kitchen, or fine dining restaurant.
 */

export interface CafeConfig {
  name: string;
  shortName: string;
  tagline: string;
  subTagline: string;
  description: string;
  aboutStory: string[];
  contact: {
    phone: string;
    phoneRaw: string;
    secondaryPhone?: string;
    email: string;
    supportEmail: string;
    address: {
      street: string;
      locality: string;
      city: string;
      state: string;
      postalCode: string;
      full: string;
      landmark: string;
    };
    googleMapsUrl: string;
    googleMapsEmbedUrl?: string;
  };
  timings: {
    daysOpen: string;
    openingHours: string;
    weekdays: string;
    weekends: string;
    lunchHours: string;
    dinnerHours: string;
  };
  social: {
    instagram: string;
    instagramUrl: string;
    facebook?: string;
    youtube?: string;
  };
  branding: {
    badgeText: string;
    logoLetter: string;
    currencySymbol: string;
    currencyCode: string;
    driveFolderName: string;
    aiAgentName: string;
    deliveryFleetName: string;
  };
  zones: Array<{
    name: string;
    description: string;
    capacity: string;
  }>;
}

export const cafeConfig: CafeConfig = {
  name: "Garden Vista Cafe & Bistro",
  shortName: "Garden Vista",
  tagline: "Outdoor Garden Dining & Artisan Cafe",
  subTagline: "Handcrafted Flavors in Nature's Lap",
  description:
    "An open-air culinary sanctuary offering signature delicacies, clay-oven tandoori breads, artisanal coffees, and refreshing handcrafted beverages amidst verdant greenery.",
  aboutStory: [
    "Conceived as a sanctuary from the urban rush, Garden Vista blends relaxed outdoor dining with gourmet North Indian culinary craft.",
    "Every recipe is prepared with locally-sourced farm fresh ingredients, slow-simmered gravies, and authentic spices perfected over generations.",
    "Whether celebrating an evening under twinkling garden lights or enjoying family dining in our private canopies, every visit is a memorable feast."
  ],
  contact: {
    phone: "+91 98765 43210",
    phoneRaw: "9876543210",
    secondaryPhone: "+91 98765 43211",
    email: "reservations@gardenvistacafe.com",
    supportEmail: "support@gardenvistacafe.com",
    address: {
      street: "Plot 104, Green Meadow Expressway",
      locality: "Garden Valley, Amer Road",
      city: "Jaipur",
      state: "Rajasthan",
      postalCode: "302028",
      full: "Plot 104, Green Meadow Expressway, Near Valley Junction, Amer Road, Jaipur, Rajasthan 302028",
      landmark: "Opposite Royal Palm Gardens, 15 Mins from City Center"
    },
    googleMapsUrl: "https://maps.google.com/?q=Garden+Vista+Cafe+Jaipur",
    googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113824.71764359051!2d75.7538!3d26.9124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDU0JzQ0LjYiTiA3NcKwNDUnMTMuNyJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
  },
  timings: {
    daysOpen: "Open Every Day (Monday to Sunday)",
    openingHours: "11:00 AM – 11:30 PM",
    weekdays: "11:00 AM – 11:00 PM",
    weekends: "11:00 AM – 12:00 Midnight",
    lunchHours: "12:00 PM – 4:00 PM",
    dinnerHours: "7:00 PM – 11:30 PM"
  },
  social: {
    instagram: "@gardenvistacafe",
    instagramUrl: "https://instagram.com/gardenvistacafe",
    facebook: "https://facebook.com/gardenvistacafe"
  },
  branding: {
    badgeText: "Fine Dining & Garden Cafe Template",
    logoLetter: "G",
    currencySymbol: "₹",
    currencyCode: "INR",
    driveFolderName: "Garden Vista - Cafe Database & Bookings",
    aiAgentName: "Aria",
    deliveryFleetName: "Garden Vista Express Fleet"
  },
  zones: [
    {
      name: "Open Lawn & Garden Terrace",
      description: "Lush green grass under fairy lights, ideal for romantic dinners and evening breezes.",
      capacity: "Up to 80 Guests"
    },
    {
      name: "Private Gazebos & Canopies",
      description: "Intimate covered cabanas for family reunions, birthdays, and private celebrations.",
      capacity: "4 to 16 Guests"
    },
    {
      name: "Air-Conditioned Glass Pavilion",
      description: "Modern indoor climate-controlled dining with panoramic garden views.",
      capacity: "Up to 45 Guests"
    }
  ]
};
