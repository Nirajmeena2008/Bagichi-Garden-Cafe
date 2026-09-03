import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  where,
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ZomatoOrder, ZomatoOrderStatus, ZomatoOrderItem } from '../types';
import { soundManager } from './soundAlert';
import { saveKotPdfToGoogleDrive } from './kotPdfService';

// The Bagichi Kitchen Display & Kitchen Order Ticket (KOT) Engine
// Handles native online ordering, takeaway, table orders, and real-time kitchen tracking.

let kotCounter = 101;

export function generateKotNumber(): string {
  kotCounter += 1;
  return `KOT-${kotCounter}`;
}

export function generateOrderNumber(): string {
  return `BAG-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const generateZomatoOrderNumber = generateOrderNumber;

/**
 * Format Kitchen Order Ticket (KOT) as standard 80mm printable thermal text
 */
export function formatKotTicketText(order: ZomatoOrder): string {
  const timestamp = order.createdAt?.toDate 
    ? order.createdAt.toDate().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const divider = "========================================";
  const singleDivider = "----------------------------------------";

  const itemsFormatted = order.items.map((it) => {
    const qtyStr = `[${it.quantity}x]`.padEnd(6, ' ');
    const nameStr = it.name;
    const noteStr = it.customization ? `\n   * Note: ${it.customization}` : '';
    return `${qtyStr} ${nameStr}${noteStr}`;
  }).join('\n');

  const channelDisplay = 
    order.channel === 'DINE_IN' ? `DINE-IN ${order.tableNumber ? `TABLE #${order.tableNumber}` : ''}` :
    order.channel === 'TAKEAWAY' ? 'TAKEAWAY / PICKUP' :
    'ONLINE DELIVERY';

  return `
${divider}
        THE BAGICHI - OUTDOOR GARDEN
              JAIPUR, RAJASTHAN
           KITCHEN ORDER TICKET (KOT)
${divider}
TICKET NO : ${order.kotNumber || 'KOT-NEW'}
ORDER NO  : ${order.orderNumber}
CHANNEL   : [ ${channelDisplay} ]
TIME      : ${timestamp}
CUSTOMER  : ${order.customerName}
${order.customerPhone ? `PHONE     : ${order.customerPhone}` : ''}
${order.alternatePhone ? `ALT PHONE : ${order.alternatePhone}` : ''}
${order.deliveryAddress ? `ADDRESS   : ${order.deliveryAddress}` : ''}
${order.landmark ? `LANDMARK  : ${order.landmark}` : ''}
${order.locationCoordinates ? `GPS COORD : ${order.locationCoordinates.lat.toFixed(5)}, ${order.locationCoordinates.lng.toFixed(5)}` : ''}
${order.mapsLink ? `MAPS LINK : ${order.mapsLink}` : ''}
${singleDivider}
ITEMS ORDERED:
${itemsFormatted}
${singleDivider}
${order.cookingInstructions ? `SPECIAL CHEF INSTRUCTIONS:
>>> ${order.cookingInstructions.toUpperCase()} <<<
${singleDivider}` : ''}
EST. PREP TIME: ${order.prepTimeMinutes || 25} MINS
STATUS        : ${order.status}
${order.riderName ? `DISPATCH/VALET: ${order.riderName} (ETA: ~${order.riderEtaMinutes || 10}m)` : ''}
${divider}
   [PRINTED VIA THE BAGICHI KITCHEN POS / KDS]
${divider}
`.trim();
}

/**
 * Recursively removes all undefined fields from an object or array before sending to Firestore
 */
export function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined)
      .map((v) => removeUndefined(v)) as unknown as T;
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const anyObj = obj as any;
    if (anyObj._methodName || anyObj._delegate) return obj;

    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        result[key] = removeUndefined(val);
      }
    }
    return result as T;
  }
  return obj;
}

/**
 * Send real-time status update to Firebase
 */
export async function updateZomatoOrderStatus(
  orderId: string, 
  status: ZomatoOrderStatus, 
  additionalData?: Partial<ZomatoOrder>
): Promise<void> {
  try {
    const orderRef = doc(db, 'zomatoOrders', orderId);
    const updatePayload: any = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    if (status === 'FOOD_READY') {
      updatePayload.foodReadyAt = new Date().toISOString();
    } else if (status === 'DISPATCHED') {
      updatePayload.dispatchedAt = new Date().toISOString();
    }

    const cleanPayload = removeUndefined(updatePayload);
    await updateDoc(orderRef, cleanPayload);
  } catch (err) {
    console.error('Failed to update order status in Firestore:', err);
    throw err;
  }
}

export const updateOrderStatus = updateZomatoOrderStatus;

/**
 * Generate or Assign a KOT number to an order (links Admin Order Management with KOT)
 */
export async function generateOrAssignKotToOrder(orderId: string, currentOrder?: ZomatoOrder): Promise<string> {
  const newKotNumber = generateKotNumber();
  const orderRef = doc(db, 'zomatoOrders', orderId);
  await updateDoc(orderRef, {
    kotNumber: newKotNumber,
    kotPrinted: false,
    updatedAt: serverTimestamp()
  });

  if (currentOrder) {
    const updated: ZomatoOrder = {
      ...currentOrder,
      kotNumber: newKotNumber
    };
    saveKotPdfToGoogleDrive(updated).catch((e) => {
      console.warn('[Google Drive] Generated KOT save notice:', e);
    });
  }
  return newKotNumber;
}

/**
 * Delete an order from Firestore (Admin only)
 */
export async function deleteRestaurantOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, 'zomatoOrders', orderId);
  await updateDoc(orderRef, { status: 'CANCELLED', updatedAt: serverTimestamp() });
}

/**
 * Place a real online customer order from the Bagichi website
 * Customer Name & Mobile are mandatory. Location and other fields are optional.
 */
export async function placeWebsiteOrder(params: {
  customerName: string;
  customerPhone: string;
  channel?: 'ONLINE_DELIVERY' | 'TAKEAWAY' | 'DINE_IN';
  deliveryAddress?: string;
  locationCoordinates?: { lat: number; lng: number };
  mapsLink?: string;
  landmark?: string;
  houseDetails?: string;
  alternatePhone?: string;
  tableNumber?: string;
  cookingInstructions?: string;
  paymentMethod?: 'COD' | 'ONLINE' | 'UPI';
  items: ZomatoOrderItem[];
  totalAmount: number;
}): Promise<ZomatoOrder> {
  const orderNumber = generateOrderNumber();
  const kotNumber = generateKotNumber();

  // Sanitize each item to ensure no undefined values exist in the array
  const sanitizedItems = (params.items || []).map((it) => {
    const itemData: any = {
      id: it.id || '',
      name: it.name || 'Dish',
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      category: it.category || 'Special',
      isCompletedInKitchen: !!it.isCompletedInKitchen
    };
    if (it.customization && typeof it.customization === 'string' && it.customization.trim()) {
      itemData.customization = it.customization.trim();
    }
    return itemData;
  });

  const newOrderData: any = {
    orderNumber,
    kotNumber,
    channel: params.channel || 'ONLINE_DELIVERY',
    customerName: params.customerName ? params.customerName.trim() : '',
    customerPhone: params.customerPhone ? params.customerPhone.trim() : '',
    deliveryAddress: params.deliveryAddress ? params.deliveryAddress.trim() : '',
    tableNumber: params.tableNumber ? params.tableNumber.trim() : '',
    cookingInstructions: params.cookingInstructions ? params.cookingInstructions.trim() : '',
    items: sanitizedItems,
    totalAmount: Number(params.totalAmount) || 0,
    status: 'PLACED',
    prepTimeMinutes: 25,
    kotPrinted: false,
    paymentMethod: params.paymentMethod || 'COD',
    paymentStatus: params.paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING',
    createdAt: serverTimestamp()
  };

  if (
    params.locationCoordinates &&
    typeof params.locationCoordinates.lat === 'number' &&
    !isNaN(params.locationCoordinates.lat) &&
    typeof params.locationCoordinates.lng === 'number' &&
    !isNaN(params.locationCoordinates.lng)
  ) {
    newOrderData.locationCoordinates = {
      lat: params.locationCoordinates.lat,
      lng: params.locationCoordinates.lng
    };
  }
  if (params.mapsLink && params.mapsLink.trim()) {
    newOrderData.mapsLink = params.mapsLink.trim();
  }
  if (params.landmark && params.landmark.trim()) {
    newOrderData.landmark = params.landmark.trim();
  }
  if (params.houseDetails && params.houseDetails.trim()) {
    newOrderData.houseDetails = params.houseDetails.trim();
  }
  if (params.alternatePhone && params.alternatePhone.trim()) {
    newOrderData.alternatePhone = params.alternatePhone.trim();
  }

  // Ensure all fields recursively are free of undefined before sending to Firestore
  const cleanOrderPayload = removeUndefined(newOrderData);
  const docRef = await addDoc(collection(db, 'zomatoOrders'), cleanOrderPayload);

  // Play audio alert instantly
  soundManager.playOrderAlert();

  const createdOrder: ZomatoOrder = {
    id: docRef.id,
    ...cleanOrderPayload,
    createdAt: new Date()
  };

  // Generate KOT PDF and automatically save it to Google Drive 'kot' folder if Drive is authorized
  saveKotPdfToGoogleDrive(createdOrder).then((res) => {
    if (res.success) {
      console.log(`[Google Drive] KOT PDF successfully saved to 'kot' folder:`, res.fileInfo?.webViewLink);
    } else if (res.isAuthRequired) {
      console.log("[Google Drive] KOT PDF generated. Drive auth pending on client.");
    }
  }).catch((err) => {
    console.warn("[Google Drive] Background KOT PDF save error:", err);
  });

  // Store locally for easy tracking recall
  try {
    localStorage.setItem('thebagichi_last_order_id', docRef.id);
    localStorage.setItem('thebagichi_last_order_num', orderNumber);
    const prevHistory = JSON.parse(localStorage.getItem('thebagichi_order_history') || '[]');
    const newHistory = [
      {
        id: docRef.id,
        orderNumber,
        kotNumber,
        customerName: cleanOrderPayload.customerName,
        customerPhone: cleanOrderPayload.customerPhone,
        totalAmount: cleanOrderPayload.totalAmount,
        channel: cleanOrderPayload.channel,
        status: 'PLACED',
        createdAt: new Date().toISOString()
      },
      ...prevHistory.filter((h: any) => h.id !== docRef.id)
    ].slice(0, 10);
    localStorage.setItem('thebagichi_order_history', JSON.stringify(newHistory));
  } catch (e) {
    console.warn("Storage write failed:", e);
  }

  return createdOrder;
}

/**
 * Fetch a single order by Firestore Document ID
 */
export async function getOrderById(orderId: string): Promise<ZomatoOrder | null> {
  if (!orderId || !orderId.trim()) return null;
  try {
    const snap = await getDoc(doc(db, 'zomatoOrders', orderId.trim()));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) };
    }
    return null;
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    return null;
  }
}

/**
 * Search orders by Order Number, KOT Number, or Phone Number
 */
export async function searchOrders(searchQuery: string): Promise<ZomatoOrder[]> {
  const queryText = searchQuery.trim();
  if (!queryText) return [];

  try {
    const ordersCol = collection(db, 'zomatoOrders');

    // 1. Try exact match by Order Number (e.g. BAG-8942)
    const q1 = query(ordersCol, where('orderNumber', '==', queryText.toUpperCase()));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }

    // 2. Try match by KOT Number (e.g. KOT-102)
    const q2 = query(ordersCol, where('kotNumber', '==', queryText.toUpperCase()));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return snap2.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    }

    // 3. Match across recent orders
    const cleanDigits = queryText.replace(/\D/g, '');
    const qAll = query(ordersCol, orderBy('createdAt', 'desc'));
    const allSnap = await getDocs(qAll);
    const results: ZomatoOrder[] = [];

    allSnap.forEach(d => {
      const data = d.data() as any;
      const phoneDigits = (data.customerPhone || '').replace(/\D/g, '');
      const orderNum = (data.orderNumber || '').toUpperCase();
      const kotNum = (data.kotNumber || '').toUpperCase();
      const custName = (data.customerName || '').toLowerCase();

      const matchesPhone = cleanDigits.length >= 6 && phoneDigits.includes(cleanDigits.slice(-10));
      const matchesNum = orderNum.includes(queryText.toUpperCase());
      const matchesKot = kotNum.includes(queryText.toUpperCase());
      const matchesName = custName.includes(queryText.toLowerCase());

      if (matchesPhone || matchesNum || matchesKot || matchesName) {
        results.push({ id: d.id, ...data });
      }
    });

    return results;
  } catch (err) {
    console.error('Error searching orders:', err);
    return [];
  }
}

/**
 * Trigger browser print dialog formatted specifically for 80mm POS Thermal Slip
 */
export function printKotTicket(order: ZomatoOrder): void {
  try {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) {
      console.warn('Popups blocked, downloading PDF instead');
      saveKotPdfToGoogleDrive(order).catch(() => {});
      return;
    }

  const kotHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT - ${order.kotNumber || order.orderNumber}</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            margin: 8px 12px;
            width: 72mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .subtitle { font-size: 11px; margin-bottom: 6px; }
          .kot-badge {
            background: #000;
            color: #fff;
            padding: 4px;
            font-size: 15px;
            font-weight: bold;
            display: block;
            margin: 6px 0;
            text-align: center;
          }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12px; }
          .item-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
          .item-qty { font-weight: bold; width: 32px; font-size: 15px; }
          .item-name { flex: 1; font-weight: bold; }
          .custom-note { font-size: 11px; font-style: italic; margin-left: 32px; color: #222; }
          .chef-instructions {
            border: 2px solid #000;
            padding: 6px;
            margin: 8px 0;
            font-weight: bold;
            font-size: 12px;
            background: #f0f0f0;
          }
          .footer { font-size: 10px; text-align: center; margin-top: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">THE BAGICHI</div>
          <div class="subtitle">Garden Dining & Cafe • Jaipur</div>
          <div class="kot-badge">${order.channel} • ${order.kotNumber || 'KOT TICKET'}</div>
        </div>

        <div class="meta-row"><span class="bold">Order #:</span> <span>${order.orderNumber}</span></div>
        <div class="meta-row"><span class="bold">Time:</span> <span>${new Date().toLocaleTimeString()}</span></div>
        <div class="meta-row"><span class="bold">Customer:</span> <span>${order.customerName}</span></div>
        ${order.riderName ? `<div class="meta-row"><span class="bold">Rider:</span> <span>${order.riderName}</span></div>` : ''}

        <div class="divider"></div>
        <div class="bold" style="margin-bottom: 4px;">KITCHEN ITEMS:</div>

        ${order.items.map(it => `
          <div class="item-row">
            <span class="item-qty">[${it.quantity}x]</span>
            <span class="item-name">${it.name}</span>
          </div>
          ${it.customization ? `<div class="custom-note">Note: ${it.customization}</div>` : ''}
        `).join('')}

        <div class="divider"></div>

        ${order.cookingInstructions ? `
          <div class="chef-instructions">
            SPECIAL INSTRUCTIONS:<br/>
            ${order.cookingInstructions}
          </div>
        ` : ''}

        <div class="meta-row">
          <span class="bold">Target Prep Time:</span>
          <span class="bold">${order.prepTimeMinutes || 25} Mins</span>
        </div>

        <div class="footer">
          Printed automatically by The Bagichi POS / KDS<br/>
          Direct Website Order & Kitchen Display System
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(kotHtml);
  printWindow.document.close();
  } catch (err) {
    console.warn('Could not print KOT thermal ticket:', err);
  }
}

/**
 * Sample realistic orders for staff testing & demo simulation
 */
export const SAMPLE_BAGICHI_ORDERS: Omit<ZomatoOrder, 'id' | 'createdAt'>[] = [
  {
    orderNumber: 'BAG-7721',
    kotNumber: 'KOT-102',
    channel: 'ONLINE_DELIVERY',
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98290 11234',
    deliveryAddress: 'Flat 402, Royal Palms, Vaishali Nagar, Jaipur',
    cookingInstructions: 'Please make Dal Makhani less spicy for children. Provide extra mint chutney and chopped onions.',
    riderName: 'The Bagichi Delivery Fleet',
    riderPhone: '+91 94140 88712',
    riderEtaMinutes: 18,
    prepTimeMinutes: 20,
    kotPrinted: false,
    status: 'PLACED',
    totalAmount: 940,
    items: [
      { id: '1', name: 'Dal Makhani Heritage', quantity: 1, price: 340, customization: 'Mild spice, extra butter' },
      { id: '2', name: 'Paneer Tikka Angara', quantity: 1, price: 380, customization: 'Crispy charcoal char' },
      { id: '3', name: 'Garlic Butter Naan', quantity: 4, price: 220, customization: 'Crisp & hot' },
    ]
  },
  {
    orderNumber: 'BAG-8834',
    kotNumber: 'KOT-103',
    channel: 'TAKEAWAY',
    customerName: 'Priya Meena',
    customerPhone: '+91 99280 44556',
    deliveryAddress: 'Takeaway Counter Pickup (Arriving in 20 mins)',
    cookingInstructions: 'Strict Jain preparation. No garlic, no onions, no root vegetables.',
    prepTimeMinutes: 25,
    kotPrinted: false,
    status: 'PLACED',
    totalAmount: 1120,
    items: [
      { id: '1', name: 'Shahi Paneer (Jain Special)', quantity: 2, price: 680, customization: 'Strict Jain recipe' },
      { id: '2', name: 'Jeera Basmati Pulao', quantity: 1, price: 240, customization: 'Pure desi ghee' },
      { id: '3', name: 'Tandoori Roti (Butter)', quantity: 4, price: 200 },
    ]
  },
  {
    orderNumber: 'BAG-9012',
    kotNumber: 'KOT-104',
    channel: 'DINE_IN',
    tableNumber: 'Garden Table 7',
    customerName: 'Karan Rathore',
    customerPhone: '+91 98281 99001',
    cookingInstructions: 'Authentic fiery Rajasthani spice level on Laal Maas. Serve sizzling hot.',
    prepTimeMinutes: 30,
    kotPrinted: false,
    status: 'PLACED',
    totalAmount: 1480,
    items: [
      { id: '1', name: 'Rajasthani Junglee Laal Maas', quantity: 2, price: 980, customization: 'Extra spicy, Mathania chillies' },
      { id: '2', name: 'Missi Roti with White Butter', quantity: 4, price: 260 },
      { id: '3', name: 'Burani Garlic Raita', quantity: 1, price: 240 },
    ]
  }
];

export const SAMPLE_ZOMATO_ORDERS = SAMPLE_BAGICHI_ORDERS;

/**
 * Place a new simulated test order into Firebase and play the incoming order bell
 */
export async function createSimulatedZomatoOrder(customOrder?: Partial<ZomatoOrder>): Promise<string> {
  const sample = SAMPLE_BAGICHI_ORDERS[Math.floor(Math.random() * SAMPLE_BAGICHI_ORDERS.length)];
  const orderNumber = generateOrderNumber();
  const kotNumber = generateKotNumber();

  const newOrder: any = {
    ...sample,
    orderNumber,
    kotNumber,
    status: 'PLACED',
    kotPrinted: false,
    createdAt: serverTimestamp(),
    ...customOrder
  };

  const cleanOrder = removeUndefined(newOrder);
  const docRef = await addDoc(collection(db, 'zomatoOrders'), cleanOrder);

  // Sound notification
  soundManager.playOrderAlert();

  const createdOrderObj: ZomatoOrder = {
    id: docRef.id,
    ...cleanOrder,
    createdAt: new Date()
  };
  saveKotPdfToGoogleDrive(createdOrderObj).catch((e) => {
    console.warn("[Google Drive] Simulated order Drive PDF save notice:", e);
  });

  return docRef.id;
}
