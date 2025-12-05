import { readFileSync, writeFileSync } from 'fs';

export interface CSVProduct {
  searchKey: string;
  url: string;
  title: string;
  breadcrumbs: string;
  productId: number;
  description: string;
  tags: string;
  imageUrls: string[];
}

export function parseCSVLine(line: string): CSVProduct | null {
  const parts = line.split(';');

  if (parts.length < 8) {
    return null;
  }

  return {
    searchKey: parts[0],
    url: parts[1],
    title: parts[2],
    breadcrumbs: parts[3],
    productId: parseInt(parts[4], 10),
    description: parts[5],
    tags: parts[6],
    imageUrls: parts[7]?.split(',').map(url => url.trim()) || []
  };
}

export function getRandomProduct(csvPath: string): CSVProduct | null {
  try {
    const content = readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * lines.length);
    const product = parseCSVLine(lines[randomIndex]);

    // Remove the selected line from CSV
    if (product) {
      lines.splice(randomIndex, 1);
      writeFileSync(csvPath, lines.join('\n'));
    }

    return product;
  } catch (error) {
    console.error('Error reading CSV:', error);
    return null;
  }
}

export function getProductFolderName(url: string): string {
  // Extract last segment from URL like /product/christmas-tree-210/ -> christmas-tree-210
  const match = url.match(/\/product\/([^\/]+)\//);
  return match ? match[1] : '';
}
