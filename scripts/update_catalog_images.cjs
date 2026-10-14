const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'lib', 'catalog.ts');
let catalogContent = fs.readFileSync(catalogPath, 'utf-8');

// Read existing pngs in public/products
const publicProductsDir = path.join(__dirname, '..', 'public', 'products');
const existingPngs = new Set(
  fs.existsSync(publicProductsDir)
    ? fs.readdirSync(publicProductsDir).map((f) => f.toLowerCase())
    : []
);

const { catalog } = require('../lib/catalog.ts');

const updatedCatalog = catalog.map((p) => {
  const pngFilename = `${p.id}.png`.toLowerCase();
  if (existingPngs.has(pngFilename)) {
    return {
      ...p,
      image: `/products/${p.id}.png`,
      imageUrl: `/products/${p.id}.png`,
    };
  }
  return p;
});

// Re-serialize catalog.ts
const newFileContent = `export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number; // in Kwanzas (Kz)
  stock: number;
  minimum: number;
  imageUrl: string;
  image: string;
  isAvailable: boolean;
  discount?: number;
  technicalSpecs?: string;
}

export const catalog: CatalogProduct[] = ${JSON.stringify(updatedCatalog, null, 2)};

export const STORE_INFO = {
  name: "Laurinita Distribuidora Ltda",
  legalName: "Laurinita Distribuidora Ltda",
  city: "Luanda",
  country: "Angola",
  currency: "AOA",
  currencySymbol: "Kz",
  phone: "+244 923 333 804",
  whatsappNumber: "244923333804",
  address: "Estrada de Catete, Km 14, Viana",
  logoUrl: "https://us-east-1-prod-treinta-assets-bucket.s3.amazonaws.com/a40e661f-40a4-595b-bea0-53e799f6561f.jpeg",
  heroSubtitle: "Equipamentos Hospitalares e Laboratoriais em Angola"
};

export function formatKwanzas(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0
  }).format(value).replace('AOA', 'Kz');
}
`;

fs.writeFileSync(catalogPath, newFileContent, 'utf-8');
console.log('Successfully updated lib/catalog.ts with local transparent PNG paths!');
