import fs from "node:fs";
import { Browser, chromium, Page } from "playwright";
import retry from "async-retry";

const baseURL = "https://www.listadomanga.es";

const getMangaData = async (page: Page, browser: Browser) => {
	const mangaList = await page.$$eval("[href^='coleccion.php?id=']", (results) =>
		results.map((result) => ({
			title: result.textContent,
			url: result.getAttribute("href") ?? "",
		}))
	);

	const genreList = await page.$$eval("[href^='lista.php?genero=']", (results) =>
		results.map((result) => ({
			title: result.textContent,
			url: result.getAttribute("href") ?? "",
		}))
	);

	const test = await Promise.all(
		genreList.map(async (genre) => {
			const context = await browser.newContext();
			const p = await context.newPage();
			await p.goto(`${baseURL}/${genre.url}`);

			p.screenshot({path: "genre.png"});

			console.log("Obteniendo mangas de género");

			const genreWithMangas = await p.$$eval("[href^='coleccion.php?id=']", (results) => {
				return results.map((result) => {
					if (!result.parentElement) return;

					const nodes = result.parentElement.childNodes;

					console.log(result.parentElement.childNodes);

					[...nodes].map((node) => {
						console.log(node.textContent);
					});
				});
				// return [{
				// 	title: results[0].parentElement.childNodestextContent,
				// 	url: results[0].href,
				// }];
			});

			console.log(genreWithMangas);

			p.close();



			return { ...genre, list: genreWithMangas };
		})
	);

	const mergedList = [{ id: 1, title: "Manga", list: mangaList }, ...test];

	// fs.writeFile("./mangas.json", JSON.stringify(mergedList), "utf8", (err) => {
	// 	if (err) {
	// 		console.error(err);
	// 	} else {
	// 		console.log("File written successfully");
	// 	}
	// });
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

		await page.screenshot({ path: "succeded.png" });
	} catch (err) {
		await page.screenshot({ path: "error.png" });
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

// (async () => {
// 	const browser = await chromium.launch();

// 	const context = await browser.newContext();
// 	const page = await context.newPage();
// 	page.setDefaultNavigationTimeout(600_000);

// 	await page.goto("https://www.listadomanga.es/lista.php");

// 	const mangaList = await page.$$eval("[href^='coleccion.php?id=']", (results) =>
// 		results.map((result) => ({
// 			title: result.textContent,
// 			url: result.href,
// 		}))
// 	);

// 	const genreList = await page.$$eval("[href^='lista.php?genero=']", (results) =>
// 		results.map((result) => ({
// 			title: result.textContent,
// 			url: result.href,
// 		}))
// 	);

// 	const test = await Promise.all(
// 		genreList.map(async (genre) => {
// 			const p = await context.newPage();
// 			await p.goto(genre.url);

// 			const genreWithMangas = await page.$$eval("[href^='coleccion.php?id=']", (results) => {
// 				return results.map((result) => {
// 					if (!result.parentElement) return;

// 					const nodes = result.parentElement.childNodes;

// 					console.log(nodes);
// 				});
// 				return [{
// 					title: results[0].parentElement.childNodestextContent,
// 					url: results[0].href,
// 				}];
// 			});

// 			p.close();

// 			return { ...genre, list: genreWithMangas };
// 		})
// 	);

// 	const mergedList = [{ id: 1, title: "Manga", list: mangaList }, ...test];

// 	await browser.close();

// 	fs.writeFile("./mangas.json", JSON.stringify(mergedList), "utf8", (err) => {
// 		if (err) {
// 			console.error(err);
// 		} else {
// 			console.log("File written successfully");
// 		}
// 	});
// })();
