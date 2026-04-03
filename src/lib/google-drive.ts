// Google Drive API — service account based
// Used for storing invoices and driver documents

import { google } from 'googleapis';
import { Readable } from 'stream';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink!,
  };
}

export async function uploadInvoice(buffer: Buffer, bookingRef: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_INVOICES;
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_INVOICES not configured');

  const result = await uploadToDrive(
    buffer,
    `Invoice-${bookingRef}.pdf`,
    'application/pdf',
    folderId
  );
  return result.webViewLink;
}

export async function uploadDriverDoc(buffer: Buffer, filename: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_DRIVER_DOCS;
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_DRIVER_DOCS not configured');

  const result = await uploadToDrive(buffer, filename, 'application/octet-stream', folderId);
  return result.webViewLink;
}
