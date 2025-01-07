import { writeFileSync } from "node:fs";
import { Browser, chromium, Page } from "playwright";
import retry from "async-retry";

const baseURL = "https://www.listadomanga.es";

let counterManga = 0;

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
		case "Números en catalán":
			return "numOfCatalanVolumes";
		case "Traducción":
			return "translation";
		case "Color":
			return "color";
		case "Edición original":
			return "originalEdition";
		case "Historia original":
			return "originalStory";
		case "Producción":
			return "production";
		case "Diseño de personajes":
			return "characterDesign";
		case "Colaborador":
			return "collaborator";
		case "Supervisión":
			return "supervision";
		case "Asistente de composición":
			return "compositionAssistant";
		case "Ilustraciones":
			return "illustrations";
		case "Historia":
			return "story";
		case "Editorial taiwanesa":
			return "taiwanesePublisher";
		case "Números en taiwanés":
			return "numOfTaiwaneseVolumes";
		case "Números en chino":
			return "numOfChineseVolumes";
		case "Editorial china":
			return "chinesePublisher";
		case "Nota":
			return "note";
		case "Editorial francesa":
			return "frenchPublisher";
		case "Números en francés":
			return "numOfFrenchVolumes";
		case "Números en malayo":
			return "numOfMalayVolumes";
		case "Asesor":
			return "advisor";
		case "Editorial vietnamita":
			return "vietnamesePublisher";
		case "Números en vietnamita":
			return "numOfVietnameseVolumes";
		case "Números en coreano":
			return "numOfKoreanVolumes";
		case "Editorial surcoreana":
			return "koreanPublisher";
		case "Editorial americana":
			return "americanPublisher";
		case "Números en inglés":
			return "numOfEnglishVolumes";
		case "Números en gallego":
			return "numOfGalicianVolumes";
		case "Adaptación":
			return "adaptation";
		case "Autores":
			return "authors";
		case "Números en español":
			return "numOfSpanishVolumes";
		case "Escenarios":
			return "scenarios";
		case "Números en valenciano":
			return "numOfValencianVolumes";
		case "Storyboard":
			return "storyboard";
		case "Entintado":
			return "inking";
		case "Editorial inglesa":
			return "englishPublisher";
		case "Números en asturiano":
			return "numOfAsturianVolumes";
		case "Editorial canadiense":
			return "canadianPublisher";
		case "Tinta":
			return "ink";
		case "Creador":
			return "creator";
		case "Asistentes":
			return "assistants";
		case "Editorial italiana":
			return "italianPublisher";
		case "Números en italiano":
			return "numOfItalianVolumes";
		case "Números en alemán":
			return "numOfGermanVolumes";
		case "Editorial alemana":
			return "germanPublisher";
		case "Números en euskera":
			return "numOfBasqueVolumes";
		case "Portada":
			return "cover";
		case "Fotografía":
			return "photography";
		case "Números en sueco":
			return "numOfSwedishVolumes";
		case "Números en portugués brasileño":
			return "numOfBrazilianPortugueseVolumes";
		case "Texto":
			return "text";
		case "Editor":
			return "editor";
		case "Novela":
			return "novel";
		case "Idea Original":
			return "originalIdea";
		case "Números en tailandés":
			return "numOfThaiVolumes";
		case "Prólogo":
			return "prologue";
		case "Narración":
			return "narration";
		case "Números en hindi":
			return "numOfHindiVolumes";
		case "Números en tailandés":
			return "numOfThaiVolumes";
		case "Números en tailandés":
			return "numOfThaiVolumes";
		case "Números en tailandés":
			return "numOfThaiVolumes";
		default:
			return key;
	}
};

const acceptCookies = async (page: Page, noConsoleLog: boolean = false) => {
	const isCookiesBannerVisible = await page.isVisible(".qc-cmp2-summary-buttons");

	if (!isCookiesBannerVisible) return;

	if (!noConsoleLog) console.log("Aceptando Cookies de la nueva página");
	await page.getByRole("button", { name: "ACEPTO" }).click();
};

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

	const genreList = [...genreRest, mangaGenre]
		.map((genre) => ({ ...genre, url: `${baseURL}/${genre.url}` }))
		.sort((a, b) => a.id - b.id);

	for (const genre of genreList) {
		console.log("Navegando a la página del género", genre.title);
		const page = await browser.newPage();
		page.setDefaultNavigationTimeout(600_000);

		await page.goto(genre.url);

		await acceptCookies(page);

		console.log("Capturando pantalla");
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
					url: baseURL,
				},
			]);

			const page = await context.newPage();
			page.setDefaultNavigationTimeout(600_000);

			await page.goto(manga.url);

			await acceptCookies(page, true);

			// console.log("Capturando pantalla")
			// await page.screenshot({ path: `./screenshots/mangas/${manga.title}.png`, fullPage: true });

			const $data = await page.locator(".izq").first().allInnerTexts();
			// const $data2 = await Promise.allSettled((await page.locator(".izq").first().all()).map((el) => el.innerText()));
			// console.log($data2);

			const mangaData = $data[0].split("\n").reduce((acc, cur, index) => {
				// console.log(index, ":", cur)
				if (index === 0) acc["title"] = cur;
				else {
					const [key, value] = cur.split(/:(.*)/s);
					// console.log(key, ":", value);
					acc[getPropertyByKey(key)] = value?.trim() ?? "";
				}

				return acc;
			}, {} as Record<string, string>);

			mangaCollection = [...mangaCollection, mangaData];

			await page.close();

			counterManga++;
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
	page.setDefaultNavigationTimeout(600_000);

	try {
		console.log("Navegando a la página");
		await page.goto("https://www.listadomanga.es/lista.php");

		acceptCookies(page);

		console.log("Obteniendo lista de mangas");
		await getMangaData(page, browser);
	} catch (err) {
		throw err;
	} finally {
		await browser.close();
		console.log("Mangas Scrapeados: ", counterManga);
	}
}

retry(main, {
	retries: 3,
	onRetry: (e: Error, attempt) => {
		console.log(`Intento ${attempt} fallido: ${e.message}`);
	},
});
