import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    const all = await prisma.constructionOpportunity.findMany();
    console.log('Total registros:', all.length);
    console.log('isTest true:', all.filter(r => r.isTest).length);
    console.log('isTest false:', all.filter(r => !r.isTest).length);
    
    // Marcar todos como reais (false) para começar
    const updated = await prisma.constructionOpportunity.updateMany({
      where: { isTest: true },
      data: { isTest: false }
    });
    console.log('\n✅ Atualizados:', updated.count, 'registros marcados como REAL');
    
    // Verificar novamente
    const final = await prisma.constructionOpportunity.findMany();
    console.log('\nAgora:');
    console.log('isTest true:', final.filter(r => r.isTest).length);
    console.log('isTest false:', final.filter(r => !r.isTest).length);
  } finally {
    await prisma.$disconnect();
  }
})();
