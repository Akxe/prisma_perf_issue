import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
	log: [
		{
			emit: 'event',
			level: 'query',
		},
	],
});

prisma.$on('query', (e) => {
	const tableName = /^SELECT .+? FROM `[a-zA-Z_]+`\.`([a-zA-Z_]+)`/.exec(e.query)?.[1] ?? 'Unknown table';
	console.log(`[${new Date(e.timestamp).toLocaleString()}] @ table "${tableName}" took ${e.duration}ms`);
});

// A `main` function so that you can use async/await
async function main() {
	const offerIDs = [1];
	const [offer, period, carrierOfOffer] = await Promise.all([
		prisma.offer.findMany({
			select: {
				offerID: true,
			},
			where: {
				offerID: {
					in: offerIDs,
				},
			},
		}),
		prisma.period.findMany({
			select: {
				periodID: true,
				text: true,
			},
			where: {
				periodsOfOffer: {
					some: {
						offerID: {
							in: offerIDs,
						},
					},
				},
			},
		}),
		prisma.carrierOfOffer.findMany({
			select: {
				offerID: true,
				carrierID: true,
				shortID: true,
				carrier: {
					select: {
						city: true,
						street: true,
					},
				},
				periods: {
					select: {
						periodID: true,
						selected: true,
						wanted: true,
					},
				},
			},
			where: {
				offerID: {
					in: offerIDs,
				},
			},
		}),
	]);

	/*console.log({
		offer,
		period,
		carrierOfOffer,
	});*/
}

main()
	.catch(e => {
		throw e
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
