import { jsPDF } from "jspdf";
import { RestaurantOrder } from "../types";
import { 
  getStoredDriveToken, 
  getOrCreateKotFolder, 
  uploadOrUpdateBinaryFile, 
  DriveFileInfo,
  initiateDriveAuth
} from "./googleDrive";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

/**
 * Generate a professional 80mm Kitchen Order Ticket (KOT) PDF
 */
export function generateKotPdf(order: RestaurantOrder): { doc: jsPDF; blob: Blob; fileName: string } {
  // Calculate dynamic ticket height based on content
  const itemsCount = order.items?.length || 1;
  const hasInstructions = Boolean(order.cookingInstructions?.trim());
  const hasAddress = Boolean(order.deliveryAddress?.trim());
  const calculatedHeight = Math.max(
    170, 
    120 + (itemsCount * 14) + (hasInstructions ? 25 : 0) + (hasAddress ? 15 : 0)
  );

  // 80mm standard restaurant thermal slip width
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, calculatedHeight]
  });

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - (margin * 2);
  let y = 8;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("THE BAGICHI", pageWidth / 2, y, { align: "center" });

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text("OUTDOOR GARDEN CAFE & RESTAURANT", pageWidth / 2, y, { align: "center" });

  y += 3.5;
  doc.text("Jaipur, Rajasthan • Direct Kitchen POS", pageWidth / 2, y, { align: "center" });

  // Top Divider
  y += 3.5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // KOT Badge Box
  y += 2.5;
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("KITCHEN ORDER TICKET (KOT)", pageWidth / 2, y + 4.8, { align: "center" });

  y += 10;
  doc.setFontSize(8.5);
  doc.setTextColor(10, 10, 10);
  doc.text(`TICKET NO :`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${order.kotNumber || "KOT-NEW"}`, margin + 22, y);

  doc.setFont("helvetica", "normal");
  doc.text(`ORDER ID :`, margin + 44, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${order.orderNumber}`, margin + 60, y);

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.text(`CHANNEL  :`, margin, y);
  doc.setFont("helvetica", "bold");
  const channelText = 
    order.channel === 'DINE_IN' ? `DINE-IN ${order.tableNumber ? `(TABLE #${order.tableNumber})` : ''}` :
    order.channel === 'TAKEAWAY' ? 'TAKEAWAY / PICKUP' : 'ONLINE DELIVERY';
  doc.text(channelText, margin + 22, y);

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.text(`DATE/TIME:`, margin, y);
  const orderTimeStr = order.createdAt?.toDate 
    ? order.createdAt.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  doc.text(orderTimeStr, margin + 22, y);

  y += 4.5;
  doc.text(`CUSTOMER :`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${order.customerName}`, margin + 22, y);

  if (order.customerPhone) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`PHONE    :`, margin, y);
    doc.text(`${order.customerPhone}`, margin + 22, y);
  }

  if (order.deliveryAddress) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`ADDRESS  :`, margin, y);
    const splitAddr = doc.splitTextToSize(order.deliveryAddress, contentWidth - 22);
    doc.text(splitAddr, margin + 22, y);
    y += (splitAddr.length - 1) * 3.5;
  }

  if (order.landmark) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`LANDMARK :`, margin, y);
    doc.text(`${order.landmark}`, margin + 22, y);
  }

  if (order.locationCoordinates) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(`GPS PIN  :`, margin, y);
    doc.text(`${order.locationCoordinates.lat.toFixed(5)}, ${order.locationCoordinates.lng.toFixed(5)}`, margin + 22, y);
  }

  // Divider
  y += 4;
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // Items Header
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text("QTY", margin + 1, y);
  doc.text("ITEM DESCRIPTION", margin + 12, y);
  doc.text("PRICE", pageWidth - margin - 1, y, { align: "right" });

  y += 2.5;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);

  // Items Listing
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 15, 15);

  order.items.forEach((it) => {
    // Quantity badge
    doc.setFont("helvetica", "bold");
    doc.text(`[${it.quantity}x]`, margin + 1, y);

    // Item name
    doc.setFont("helvetica", "bold");
    const itemNameLines = doc.splitTextToSize(it.name, contentWidth - 26);
    doc.text(itemNameLines, margin + 12, y);

    // Price
    doc.setFont("helvetica", "normal");
    doc.text(`Rs.${it.price * it.quantity}`, pageWidth - margin - 1, y, { align: "right" });

    y += itemNameLines.length * 3.8;

    // Customization note if any
    if (it.customization?.trim()) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.8);
      doc.setTextColor(180, 83, 9); // amber tone
      const noteLines = doc.splitTextToSize(`* Note: ${it.customization}`, contentWidth - 14);
      doc.text(noteLines, margin + 12, y);
      y += noteLines.length * 3.2;
      doc.setTextColor(15, 15, 15);
      doc.setFontSize(8);
    }
  });

  // Divider
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // Special Cooking Instructions Box
  if (order.cookingInstructions?.trim()) {
    y += 3;
    doc.setFillColor(254, 243, 199);
    const instLines = doc.splitTextToSize(`CHEF NOTE: ${order.cookingInstructions}`, contentWidth - 4);
    const boxHeight = (instLines.length * 3.5) + 4;
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1, 1, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text(instLines, margin + 2, y + 3.5);
    
    y += boxHeight + 2;
  }

  // Summary
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`TOTAL ITEMS ORDERED :`, margin, y);
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  doc.setFont("helvetica", "bold");
  doc.text(`${totalQty} Dishes`, pageWidth - margin - 1, y, { align: "right" });

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`EST. PREPARATION TIME:`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.text(`~${order.prepTimeMinutes || 25} Mins`, pageWidth - margin - 1, y, { align: "right" });

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`GRAND TOTAL AMOUNT   :`, margin, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Rs. ${order.totalAmount}`, pageWidth - margin - 1, y, { align: "right" });

  // Bottom Divider
  y += 4;
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // Footer & Drive confirmation tag
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Saved in Google Drive: folder /kot", pageWidth / 2, y, { align: "center" });

  y += 3.2;
  doc.text("The Bagichi Cloud Kitchen Display & POS System", pageWidth / 2, y, { align: "center" });

  const fileName = `KOT_${order.kotNumber || 'TICKET'}_${order.orderNumber}.pdf`;
  const blob = doc.output("blob");

  return { doc, blob, fileName };
}

/**
 * Save the generated KOT PDF into the Google Drive folder named 'kot'.
 * Also updates the Firestore document with the Drive view link.
 */
export async function saveKotPdfToGoogleDrive(
  order: RestaurantOrder,
  existingBlob?: Blob
): Promise<{ 
  success: boolean; 
  fileInfo?: DriveFileInfo; 
  folderLink?: string; 
  error?: string;
  isAuthRequired?: boolean;
}> {
  try {
    const token = getStoredDriveToken();
    if (!token) {
      return { 
        success: false, 
        isAuthRequired: true, 
        error: "Google Drive is not authorized. Please connect Google Drive to upload KOT PDF." 
      };
    }

    // 1. Ensure the dedicated 'kot' folder exists in Drive
    const kotFolder = await getOrCreateKotFolder(token);

    // 2. Generate or use provided PDF Blob
    const { blob, fileName } = existingBlob 
      ? { blob: existingBlob, fileName: `KOT_${order.kotNumber || 'TICKET'}_${order.orderNumber}.pdf` }
      : generateKotPdf(order);

    // 3. Upload binary PDF to Google Drive 'kot' folder
    const uploadedFile = await uploadOrUpdateBinaryFile(
      token,
      kotFolder.id,
      fileName,
      "application/pdf",
      blob
    );

    // 4. Update the order document in Firestore with the Drive PDF link
    if (order.id) {
      try {
        const orderRef = doc(db, "zomatoOrders", order.id);
        await updateDoc(orderRef, {
          kotDrivePdfUrl: uploadedFile.webViewLink || '',
          kotDriveFileId: uploadedFile.id,
          kotSavedToDriveAt: new Date().toISOString()
        });
      } catch (firestoreErr) {
        console.warn("Could not record Drive PDF link in Firestore order:", firestoreErr);
      }
    }

    return {
      success: true,
      fileInfo: uploadedFile,
      folderLink: kotFolder.webViewLink
    };
  } catch (err: any) {
    console.error("Failed to save KOT PDF to Google Drive:", err);
    return {
      success: false,
      error: err?.message || "Unknown error uploading KOT PDF to Google Drive"
    };
  }
}

/**
 * Trigger immediate client-side download of the KOT PDF
 */
export function downloadKotPdfLocally(order: RestaurantOrder) {
  const { doc, fileName } = generateKotPdf(order);
  doc.save(fileName);
}
