import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

function timePromise<T>(description: string, promise: T | Promise<T>): Promise<T> {
	if (!(promise instanceof Promise)) {
		promise = Promise.resolve(promise);
	}

	console.time(description);
	promise.finally(() => console.timeEnd(description));

	return promise;
}

// A `main` function so that you can use async/await
async function main() {
	const offerIDs = [1];
	const [offer, period, carrierOfOffer] = await Promise.all([
		timePromise('offer', prisma.offer.findMany({
			select: {
				offerID: true,
			},
			where: {
				offerID: {
					in: offerIDs,
				},
			},
		})),
		timePromise('period', prisma.period.findMany({
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
		})),
		timePromise('carrierOfOffer', prisma.carrierOfOffer.findMany({
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
		})),
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
