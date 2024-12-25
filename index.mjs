import fs from "node:fs";
import { chromium } from "playwright";

(async () => {
	const browser = await chromium.launch({
		headless: true,
	});

	const context = await browser.newContext();
	const page = await context.newPage();
	page.setDefaultNavigationTimeout(600_000);

	await page.goto("https://www.listadomanga.es/lista.php");

	const mangaList = await page.$$eval("[href^='coleccion.php?id=']", (results) =>
		results.map((result) => ({
			title: result.textContent,
			url: result.href,
		}))
	);

	const genreList = await page.$$eval("[href^='lista.php?genero=']", (results) =>
		results.map((result) => ({
			title: result.textContent,
			url: result.href,
		}))
	);

	const test = await Promise.all(
		genreList.map(async (genre) => {
			const p = await browser.newPage();
			await p.goto(genre.url);

			const genreWithMangas = await page.$$eval("[href^='coleccion.php?id=']", (results) => {
				results.map((result) => {
					console.log(result)
					// title: result.textContent,
					// url: result.href,
				});
			});

			p.close();

			return { ...genre, list: genreWithMangas };
		})
	);

	const mergedList = [{ id: 1, title: "Manga", list: mangaList }, ...test];

	await browser.close();

	fs.writeFile("./mangas.json", JSON.stringify(mergedList), "utf8", (err) => {
		if (err) {
			console.error(err);
		} else {
			console.log("File written successfully");
		}
	});
})();
