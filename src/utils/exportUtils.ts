import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (!data || data.length === 0) {
    return;
  }

  // If headers are not provided, use keys from the first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Convert data to CSV format
  const csvContent = [
    csvHeaders.join(','), // Header row
    ...data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        // Handle strings with commas or quotes by wrapping in quotes
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create a Blob containing the CSV data
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a temporary link element to trigger the download
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  filename: string
) => {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToPDF = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const tableHeaders = headers || Object.keys(data[0]);
  
  // Transform data for autotable
  // We need to ensure values are strings or numbers, not objects
  const tableData = data.map(row => 
    tableHeaders.map(header => {
      const val = row[header];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    })
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    styles: { fontSize: 8 }, // Smaller font to fit more columns
    theme: 'grid'
  });

  doc.save(`${filename}.pdf`);
};
