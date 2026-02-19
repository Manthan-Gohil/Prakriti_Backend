const prisma = require('./src/config/database');

async function test() {
    const doshaCount = await prisma.doshaPrediction.count();
    const prakritiCount = await prisma.prakritiPrediction.count();
    console.log('Dosha predictions total:', doshaCount);
    console.log('Prakriti predictions total:', prakritiCount);

    const doshaSample = await prisma.doshaPrediction.findMany({ take: 3 });
    console.log('\nDosha samples:');
    doshaSample.forEach(d => {
        console.log(`  userId: ${d.userId}, type: ${d.imbalanceType}, createdAt: ${d.createdAt}`);
    });

    const prakritiSample = await prisma.prakritiPrediction.findMany({ take: 3 });
    console.log('\nPrakriti samples:');
    prakritiSample.forEach(p => {
        console.log(`  userId: ${p.userId}, type: ${p.prakritiType}, createdAt: ${p.createdAt}`);
    });

    // Check which users exist
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log('\nAll users:');
    users.forEach(u => console.log(`  ${u.id} -> ${u.email}`));

    await prisma.$disconnect();
}

test().catch(e => { console.error(e); process.exit(1); });
