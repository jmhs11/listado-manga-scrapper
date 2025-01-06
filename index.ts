import { writeFileSync } from "node:fs";
import { Browser, chromium, Page } from "playwright";
import retry from "async-retry";

const baseURL = "https://www.listadomanga.es";

const getPropertyByKey = (key: string) => {
	switch (key) {
		case "Título original":
			return "originalTitle";
		case "Guion":
			return "script";
		case "Dibujo":
			return "drawing";
		case "Editorial japonesa":
			return "japanesePublisher";
		case "Editorial española":
			return "spanishPublisher";
		case "Colección":
			return "demography";
		case "Formato":
			return "format";
		case "Sentido de lectura":
			return "readingDirection";
		case "Números en japonés":
			return "numOfJapaneseVolumes";
		case "Números en castellano":
			return "numOfSpanishVolumes";
		default:
			return key;
	}
}

const acceptCookies = async (page: Page, noConsoleLog: boolean = false) => {
	const isCookiesBannerVisible = await page.isVisible(".qc-cmp2-summary-buttons")

	if (!isCookiesBannerVisible) return;

	if (!noConsoleLog) console.log("Aceptando Cookies de la nueva página")
	await page.getByRole("button", { name: "ACEPTO" }).click();
}

const getMangaData = async (page: Page, browser: Browser) => {
	const mangaGenre = {
		id: 1,
		title: "Manga 漫画",
		url: "lista.php",
	};

	const genreRest = await page.$$eval("[href^='lista.php?genero=']", (results) =>
		results.map((result) => ({
			id: Number(result.getAttribute("href")?.split("=")[1]),
			title: result.textContent,
			url: result.getAttribute("href") ?? "",
		}))
	);

	const genreList = [mangaGenre, ...genreRest].map((genre) => ({ ...genre, url: `${baseURL}/${genre.url}` })).sort((a, b) => a.id - b.id);

	for (const genre of genreList) {
		console.log("Navegando a la página del género", genre.title);
		const page = await browser.newPage();

		await page.goto(genre.url);

		await acceptCookies(page);

		console.log("Capturando pantalla")
		await page.screenshot({ path: `./screenshots/genres/${genre.title}.png`, fullPage: true });

		const mangaList = await page.$$eval("[href^='coleccion.php?id=']", (results) =>
			results.map((result) => ({
				title: result.textContent,
				url: result.getAttribute("href") ?? "",
			}))
		);

		let mangaCollection = [] as Record<string, string>[];

		for (const manga of mangaList.map((manga) => ({ ...manga, url: `${baseURL}/${manga.url}` }))) {
			console.log("Extrayendo manga: ", manga.title);
			const context = await browser.newContext();

			context.addCookies([
				{
					name: "mostrarNSFW",
					value: "true",
					url: baseURL
				}
			]);

			const page = await context.newPage();

			await page.goto(manga.url);

			await acceptCookies(page, true);

			// console.log("Capturando pantalla")
			// await page.screenshot({ path: `./screenshots/mangas/${manga.title}.png`, fullPage: true });

			const $data = await page.locator(".izq").first().allInnerTexts();

			const mangaData = $data[0].split("\n").reduce((acc, cur) => {
				if (cur.includes(":")) {
					const [key, value] = cur.split(":")
					acc[getPropertyByKey(key)] = value.trim();
				} else if (!cur.includes(":")) {
					acc["title"] = cur;
				} else {
					acc[cur] = cur;
				}
				return acc;
			}, {} as Record<string, string>);

			mangaCollection = [...mangaCollection, mangaData];

			await page.close();
		}

		writeFileSync(`./data/${genre.title}.json`, JSON.stringify(mangaCollection, null, 2));

		console.log("Manga data saved to file");

		await page.close();
	}
};

async function main() {
	console.log("Empezando a scrapear");

	const browser = await chromium.launch();

	const page = await browser.newPage();

	try {
		console.log("Navegando a la página");
		await page.goto("https://www.listadomanga.es/lista.php", { timeout: 600_000 });

		console.log("Aceptando cookies");
		await page.getByRole("button", { name: "ACEPTO" }).click();

		console.log("Obteniendo lista de mangas");
		await getMangaData(page, browser);
	} catch (err) {
		throw err;
	} finally {
		await browser.close();
	}
}

retry(main, {
	retries: 3,
	onRetry: (e: Error, attempt) => {
		console.log(`Intento ${attempt} fallido: ${e.message}`);
	},
});