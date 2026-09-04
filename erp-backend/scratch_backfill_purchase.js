const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const IVA_RATE = 0.19;
function breakdownIva(grossTotal) {
  const net = Math.round(grossTotal / (1 + IVA_RATE));
  return { net, iva: grossTotal - net, total: grossTotal };
}

const items = [
  { name: 'Easy clean 20k', unitCost: 11000 },
  { name: 'Space cat 2k', unitCost: 11000 },
  { name: 'Space cat 8k', unitCost: 9800 },
  { name: 'Space cat 4k', unitCost: 8500 },
  { name: 'Space cat 20k', unitCost: 8060 },
  { name: 'Purina gatitos', unitCost: 50900 },
  { name: 'Purina deli mix 19.5kg', unitCost: 49000 },
  { name: 'tyson', unitCost: 21500 },
  { name: 'Superpet', unitCost: 17500 },
  { name: 'Acomer natural', unitCost: 28816 },
  { name: 'Acomer 25k', unitCost: 27500 },
  { name: 'Máster dog pollo', unitCost: 25300 },
  { name: 'Máster dog señor', unitCost: 26000 },
  { name: 'Máster dog raza pequeña', unitCost: 24590 },
  { name: 'Máster dog cachorro', unitCost: 24590 },
  { name: 'Máster dog carne', unitCost: 26000 },
  { name: 'Nomade señor raza pequeña', unitCost: 17500 },
  { name: 'Nomade señor', unitCost: 25300 },
  { name: 'Nomade cachorro', unitCost: 19500 },
  { name: 'Nomade adulto raza pequeña', unitCost: 17500 },
  { name: 'Nomade adulto', unitCost: 29500 },
  { name: 'Fit señor 20k', unitCost: 36750 },
  { name: 'Fit señor raza pequeña 10k', unitCost: 22220 },
  { name: 'Fit cachorro 10k', unitCost: 17900 },
  { name: 'Fit adulto raza pequeña 10k', unitCost: 17900 },
  { name: 'Fit adulto', unitCost: 31800 },
  { name: 'Fit gato', unitCost: 22900 },
  { name: 'Alaska señor 15k', unitCost: 31000 },
  { name: 'Alaska adulto 15k', unitCost: 31000 },
  { name: 'Alaska cachorro', unitCost: 25500 },
];

async function main() {
  const supplier = await prisma.supplier.upsert({
    where: { rut: '999999999' },
    update: {},
    create: { name: 'Stock Inicial', rut: '999999999' },
  });
  console.log('Proveedor:', supplier.name, supplier.id);

  const products = await prisma.product.findMany();
  const byName = new Map(products.map((p) => [p.name.trim(), p]));

  const itemsData = [];
  const report = [];
  let grossTotal = 0;

  for (const item of items) {
    const product = byName.get(item.name.trim());
    if (!product) {
      report.push({ name: item.name, status: 'NO ENCONTRADO - se omite' });
      continue;
    }
    if (product.quantity <= 0) {
      report.push({ name: item.name, status: `omitido (cantidad actual ${product.quantity})` });
      continue;
    }
    const quantity = product.quantity;
    const lineTotal = quantity * item.unitCost;
    grossTotal += lineTotal;
    itemsData.push({
      productId: product.id,
      quantity,
      remainingQty: quantity,
      unitCost: item.unitCost,
      lineTotal,
    });
    report.push({ name: item.name, status: 'ok', quantity, unitCost: item.unitCost, lineTotal });
  }

  console.log(JSON.stringify(report, null, 2));

  if (itemsData.length === 0) {
    console.log('Nada que hacer.');
    return;
  }

  console.log(`\nTotal a registrar: ${itemsData.length} productos, $${grossTotal.toLocaleString('es-CL')} bruto.`);

  if (process.env.CONFIRM !== 'yes') {
    console.log('\n(Solo revisión, no se creó nada. Vuelve a correr con CONFIRM=yes para aplicar.)');
    return;
  }

  const { net, iva } = breakdownIva(grossTotal);

  // OJO: a propósito NO se incrementa Product.quantity acá (a diferencia del
  // flujo normal de compras) porque esa cantidad ya está correcta en la
  // tabla Product de antes; esto solo crea el lote FIFO (PurchaseItem) que
  // le faltaba para que la venta lo reconozca como stock real.
  const purchase = await prisma.purchase.create({
    data: {
      supplierId: supplier.id,
      subtotalNet: net,
      ivaAmount: iva,
      total: grossTotal,
      items: { create: itemsData },
    },
  });

  console.log('Compra creada:', purchase.id, 'total:', grossTotal, 'items:', itemsData.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
