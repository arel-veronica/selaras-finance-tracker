import { Transaction, CategoryItem } from '../types/finance';
import { ALL_DEFAULT_CATEGORIES } from '../data/categories';

const DEFAULT_SPREADSHEET_NAME = 'Selaras Finance - Catatan Keuangan Keluarga';

export const TRANSAKSI_HEADERS = [
  'transaction_id',
  'tanggal_transaksi',
  'waktu_pencatatan',
  'jenis_transaksi',
  'kategori',
  'deskripsi',
  'nominal',
  'nama_pencatat',
  'sumber_transaksi',
  'status_konfirmasi',
];

export const KATEGORI_HEADERS = ['nama_kategori', 'jenis_transaksi', 'status_aktif'];

interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
  transaksiSheetId?: number;
}

/**
 * Search Drive for an existing Selaras Finance spreadsheet or create one
 */
export async function findOrCreateHouseholdSpreadsheet(
  accessToken: string,
  preferredTitle: string = DEFAULT_SPREADSHEET_NAME
): Promise<SpreadsheetInfo> {
  // 1. Search existing file in Drive
  const query = encodeURIComponent(
    `name = '${preferredTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    console.error('Error searching drive:', errorText);
    throw new Error(`Gagal mencari spreadsheet di Google Drive: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existingFile = searchData.files[0];
    const sheetDetails = await getSpreadsheetMetadata(accessToken, existingFile.id);
    return {
      id: existingFile.id,
      name: existingFile.name,
      url: existingFile.webViewLink || `https://docs.google.com/spreadsheets/d/${existingFile.id}`,
      transaksiSheetId: sheetDetails.transaksiSheetId,
    };
  }

  // 2. Create new spreadsheet if not found
  return await createNewSpreadsheet(accessToken, preferredTitle);
}

/**
 * Creates a brand new spreadsheet with TRANSAKSI and KATEGORI sheets
 */
export async function createNewSpreadsheet(
  accessToken: string,
  title: string = DEFAULT_SPREADSHEET_NAME
): Promise<SpreadsheetInfo> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'TRANSAKSI',
            gridProperties: { rowCount: 1000, columnCount: 12, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'KATEGORI',
            gridProperties: { rowCount: 100, columnCount: 5, frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error('Error creating spreadsheet:', errorText);
    throw new Error(`Gagal membuat spreadsheet baru: ${createRes.statusText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const transaksiSheetId = createdData.sheets?.[0]?.properties?.sheetId || 0;

  // Initialize TRANSAKSI headers
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSAKSI!A1:J1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [TRANSAKSI_HEADERS],
      }),
    }
  );

  // Initialize KATEGORI headers & default categories
  const kategoriRows = [
    KATEGORI_HEADERS,
    ...ALL_DEFAULT_CATEGORIES.map((cat) => [cat.nama_kategori, cat.jenis_transaksi, cat.status_aktif ? 'AKTIF' : 'NONAKTIF']),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/KATEGORI!A1:C${kategoriRows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: kategoriRows,
      }),
    }
  );

  return {
    id: spreadsheetId,
    name: title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    transaksiSheetId,
  };
}

/**
 * Fetch spreadsheet metadata to get the sheetId for batchUpdate operations
 */
export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{ transaksiSheetId: number; sheetsList: string[] }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Gagal memuat metadata spreadsheet');
  }

  const data = await res.json();
  const sheets = data.sheets || [];
  let transaksiSheetId = 0;
  const sheetsList: string[] = [];

  for (const s of sheets) {
    const prop = s.properties || {};
    sheetsList.push(prop.title);
    if (prop.title === 'TRANSAKSI') {
      transaksiSheetId = prop.sheetId;
    }
  }

  // If TRANSAKSI sheet doesn't exist, we can create it
  if (!sheetsList.includes('TRANSAKSI')) {
    await addSheetTab(accessToken, spreadsheetId, 'TRANSAKSI');
    // populate headers
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSAKSI!A1:J1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [TRANSAKSI_HEADERS] }),
      }
    );
  }

  return { transaksiSheetId, sheetsList };
}

async function addSheetTab(accessToken: string, spreadsheetId: string, title: string) {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: { title },
          },
        },
      ],
    }),
  });
}

/**
 * Fetch all transactions from sheet TRANSAKSI
 */
export async function fetchTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Transaction[]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSAKSI!A2:J1000`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Fetch transactions error:', errorText);
    throw new Error(`Gagal membaca data dari Google Sheets: ${res.statusText}`);
  }

  const data = await res.json();
  const rows = data.values || [];

  const transactions: Transaction[] = [];

  rows.forEach((row: any[], index: number) => {
    // If row is empty, skip
    if (!row || row.length === 0 || !row[0]) return;

    const [
      transaction_id,
      tanggal_transaksi,
      waktu_pencatatan,
      jenis_transaksi,
      kategori,
      deskripsi,
      nominalRaw,
      nama_pencatat,
      sumber_transaksi,
      status_konfirmasi,
    ] = row;

    const nominal = typeof nominalRaw === 'number' ? nominalRaw : parseFloat(String(nominalRaw).replace(/[^\d.-]/g, '')) || 0;

    transactions.push({
      transaction_id: transaction_id || `TX-${Date.now()}-${index}`,
      tanggal_transaksi: tanggal_transaksi || new Date().toISOString().split('T')[0],
      waktu_pencatatan: waktu_pencatatan || '12:00:00',
      jenis_transaksi: (jenis_transaksi === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran'),
      kategori: kategori || 'Lain-lain',
      deskripsi: deskripsi || '-',
      nominal,
      nama_pencatat: nama_pencatat || 'Suami',
      sumber_transaksi: (sumber_transaksi || 'Input Manual') as any,
      status_konfirmasi: (status_konfirmasi || 'Terkonfirmasi') as any,
      sheetRowIndex: index + 2, // 1-indexed; row 1 is header, so row index starts at 2
    });
  });

  return transactions;
}

/**
 * Append single transaction to TRANSAKSI sheet
 */
export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: Transaction
): Promise<boolean> {
  const rowData = [
    tx.transaction_id,
    tx.tanggal_transaksi,
    tx.waktu_pencatatan,
    tx.jenis_transaksi,
    tx.kategori,
    tx.deskripsi,
    tx.nominal,
    tx.nama_pencatat,
    tx.sumber_transaksi,
    tx.status_konfirmasi,
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSAKSI!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Append transaction error:', errorText);
    throw new Error(`Gagal menyimpan transaksi ke Google Sheets: ${res.statusText}`);
  }

  return true;
}

/**
 * Update transaction row in TRANSAKSI sheet
 */
export async function updateTransactionInSheet(
  accessToken: string,
  spreadsheetId: string,
  rowIndex: number,
  tx: Transaction
): Promise<boolean> {
  const rowData = [
    tx.transaction_id,
    tx.tanggal_transaksi,
    tx.waktu_pencatatan,
    tx.jenis_transaksi,
    tx.kategori,
    tx.deskripsi,
    tx.nominal,
    tx.nama_pencatat,
    tx.sumber_transaksi,
    tx.status_konfirmasi,
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSAKSI!A${rowIndex}:J${rowIndex}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Update transaction error:', errorText);
    throw new Error(`Gagal memperbarui transaksi di Google Sheets: ${res.statusText}`);
  }

  return true;
}

/**
 * Delete transaction row from TRANSAKSI sheet using batchUpdate deleteDimension
 */
export async function deleteTransactionFromSheet(
  accessToken: string,
  spreadsheetId: string,
  transaksiSheetId: number,
  rowIndex: number // 1-indexed row number, so row 2 is 0-indexed startIndex 1
): Promise<boolean> {
  const startIndex = rowIndex - 1;
  const endIndex = rowIndex;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: transaksiSheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Delete transaction error:', errorText);
    throw new Error(`Gagal menghapus baris dari Google Sheets: ${res.statusText}`);
  }

  return true;
}
