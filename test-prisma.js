const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.reservation.update({
      where: { reservationNumber: 'BGC-HXEV7Z' },
      data: {
        preOrders: { create: [{ menuItemId: '1140cd5a-8a01-4079-9757-beff25102026', quantity: 1 }] }
      }
    });
    console.log("Success");
  } catch (err) { console.error(err); }
}
main();
