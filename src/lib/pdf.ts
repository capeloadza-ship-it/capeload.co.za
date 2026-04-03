// PDFKit invoice generator
// Generates a professional invoice PDF for bookings

import PDFDocument from 'pdfkit';

interface InvoiceData {
  ref: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  jobType: string;
  vehicle: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  date: string;
  time: string;
  baseFare: number;
  distanceCost: number;
  total: number;
  paymentMethod: string;
}

export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const orange = '#f15f22';
    const dark = '#1a1a1a';
    const gray = '#666';
    const lightGray = '#e8e8e5';

    // Header
    doc.fontSize(28).fillColor(orange).text('CapeLoad', 50, 50);
    doc.fontSize(9).fillColor(gray).text('LOGISTICS', 50, 82);
    doc.fontSize(10).fillColor(gray).text('Your load, our road.', 50, 95);

    // Invoice label
    doc.fontSize(24).fillColor(dark).text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).fillColor(gray).text(data.ref, 400, 80, { align: 'right' });
    doc.text(new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }), 400, 95, { align: 'right' });

    // Divider
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor(lightGray).stroke();

    // Client details
    doc.fontSize(11).fillColor(dark).text('Bill to:', 50, 140);
    doc.fontSize(10).fillColor(gray);
    doc.text(data.clientName || 'Guest', 50, 158);
    if (data.clientPhone) doc.text(data.clientPhone, 50, 173);
    if (data.clientEmail) doc.text(data.clientEmail, 50, 188);

    // Booking details
    doc.fontSize(11).fillColor(dark).text('Booking details:', 300, 140);
    doc.fontSize(10).fillColor(gray);
    doc.text(`Job type: ${data.jobType}`, 300, 158);
    doc.text(`Vehicle: ${data.vehicle}`, 300, 173);
    doc.text(`Date: ${data.date} at ${data.time}`, 300, 188);

    // Route
    doc.moveTo(50, 215).lineTo(545, 215).strokeColor(lightGray).stroke();
    doc.fontSize(11).fillColor(dark).text('Route', 50, 230);
    doc.fontSize(10).fillColor(gray);
    doc.text(`From: ${data.pickup}`, 50, 248);
    doc.text(`To: ${data.dropoff}`, 50, 263);
    doc.text(`Distance: ${data.distanceKm} km`, 50, 278);

    // Price breakdown table
    doc.moveTo(50, 305).lineTo(545, 305).strokeColor(lightGray).stroke();

    // Table header
    const tableTop = 320;
    doc.fontSize(10).fillColor(dark);
    doc.text('Description', 50, tableTop);
    doc.text('Amount', 450, tableTop, { align: 'right' });
    doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).strokeColor(lightGray).stroke();

    // Table rows
    let y = tableTop + 30;
    doc.fillColor(gray);
    doc.text('Base fare', 50, y);
    doc.text(`R${data.baseFare.toLocaleString()}`, 450, y, { align: 'right' });

    y += 22;
    doc.text(`Distance charge (${data.distanceKm} km)`, 50, y);
    doc.text(`R${data.distanceCost.toLocaleString()}`, 450, y, { align: 'right' });

    // Total
    y += 30;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(dark).lineWidth(1.5).stroke();
    y += 12;
    doc.fontSize(14).fillColor(dark).text('Total', 50, y);
    doc.fontSize(14).fillColor(orange).text(`R${data.total.toLocaleString()}`, 450, y, { align: 'right' });

    // Payment method
    y += 35;
    doc.fontSize(10).fillColor(gray).text(`Payment method: ${data.paymentMethod.toUpperCase()}`, 50, y);

    // Footer
    const footerY = 750;
    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(lightGray).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(gray);
    doc.text('CapeLoad Logistics | Cape Town, Western Cape | capeload.co.za', 50, footerY + 10, { align: 'center' });
    doc.text('Thank you for choosing CapeLoad — your load, our road.', 50, footerY + 24, { align: 'center' });

    doc.end();
  });
}
