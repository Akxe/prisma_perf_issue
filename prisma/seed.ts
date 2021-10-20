import { PrismaClient } from '@prisma/client';
import { address, datatype } from 'faker';

const prisma = new PrismaClient();
const carrierCountInOffer = [250, 150, 100];
const rowCounts: Record<Exclude<keyof typeof prisma, `$${string}`>, number> = {
	carrier: 92_500,
	period: 120,
	offer: 3_500,

	//	Approximate row count in our real DB
	periodsOfOffer: 31_500,
	carrierOfOffer: 220_000,
	carrierInPeriod: 1_110_000,
};

const bulkSize = 1000;
async function asyncForEach<T>(arr: T[], callback: (item: T[], index: number) => Promise<any>) {
	const bulks: T[][] = [];

	for (let i = 0; i < Math.ceil(arr.length / bulkSize); i++) {
		bulks.push(arr.slice(i * bulkSize, (i + 1) * bulkSize));
	}

	for (let index = 0; index < bulks.length; index++) {
		await callback(bulks[index], index);
	}
}

function uniqueRandom<T>(randomFn: () => T): () => T {
	const usedUnique = new Set<T>();
	return () => {
		let newUnique = randomFn();
		while (usedUnique.has(newUnique)) {
			newUnique = randomFn();
		}

		usedUnique.add(newUnique);
		return newUnique;
	};
}

// A `main` function so that you can use async/await
async function main() {
	await Promise.all([
		prisma.carrier.deleteMany(),
		prisma.periodsOfOffer.deleteMany(),
		prisma.carrierOfOffer.deleteMany(),
		prisma.carrierInPeriod.deleteMany(),
	]);

	await asyncForEach(
		Array.from({ length: rowCounts.carrier }, (_, index) => {
			return {
				carrierID: index + 1,
				city: address.cityName(),
				street: address.streetAddress(),
			};
		}),
		data => prisma.carrier.createMany({ data }),
	);

	await prisma.period.createMany({
		data: Array.from({ length: rowCounts.period }, (_, index) => {
			return {
				periodID: index + 1,
				text: `${index % 12 + 1}/${Math.floor(index / 12) + 2013}`,
			};
		}),
		skipDuplicates: true,
	});

	await prisma.offer.createMany({
		data: Array.from({ length: rowCounts.offer }, (_, index) => {
			return { offerID: index + 1 };
		}),
		skipDuplicates: true,
	});

	const data = Array.from({ length: rowCounts.offer }, (_, index) => {
		const offerID = index + 1;
		const startPeriodID = datatype.number({
			min: 1,
			max: rowCounts.period - 12,
		});

		//	Needed average of 35
		const numberOfCarrierInOffer = carrierCountInOffer[offerID - 1] ?? datatype.number({ min: 10, max: 60 });
		const uniqueFactory = uniqueRandom(() => datatype.number(rowCounts.carrier));
		const carriersOfOffer = Array.from({ length: numberOfCarrierInOffer }, uniqueFactory);

		//	Needed average of 9
		const periodsOfOffer = Array.from({ length: datatype.number({ min: 6, max: 12 }), }, (_, index) => {
			const periodID = startPeriodID + index;

			return {
				periodsOfOffer: { offerID, periodID },
				carrierInPeriod: carriersOfOffer.map(carrierID => {
					return {
						offerID,
						periodID,
						carrierID,

						selected: datatype.boolean(),
						wanted: datatype.boolean(),
					};
				}),
			};
		});

		return {
			periodsOfOffer: periodsOfOffer.flatMap(res => res.periodsOfOffer),
			carrierOfOffer: carriersOfOffer.map((carrierID, index) => {
				return {
					offerID,
					carrierID,
					shortID: index + 1,
				};
			}),
			carrierInPeriod: periodsOfOffer.flatMap(res => res.carrierInPeriod),
		};
	});

	await asyncForEach(
		data.flatMap(row => row.periodsOfOffer),
		data => prisma.periodsOfOffer.createMany({ data }),
	);

	await asyncForEach(
		data.flatMap(row => row.carrierOfOffer),
		data => prisma.carrierOfOffer.createMany({ data }),
	);

	await asyncForEach(
		data.flatMap(row => row.carrierInPeriod),
		data => prisma.carrierInPeriod.createMany({ data }),
	);
}

main()
	.catch(e => {
		throw e
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
