import { chromium } from "playwright";

const browser = await chromium.launch({
	headless: true,
});


const page = await browser.newPage();
page.setDefaultNavigationTimeout(600_000)

await page.goto("https://www.listadomanga.es/lista.php");

// const mangaList = await page.$$eval("[href^='coleccion.php?id=']", (results) =>
// 	results.map((result) => ({
// 		title: result.textContent,
// 		url: result.href,
// 	}))
// );

const genreList = await page.$$eval("[href^='lista.php?genero=']", (results) =>
	results.map((result) => ({
		title: result.textContent,
		url: result.href,
	}))
);

const test = await Promise.all(
  genreList.map(async (genre) => {
		await page.goto(genre.url, { waitUntil: "domcontentloaded" });

		const genreWithMangas = await page.$$eval("[href^='coleccion.php?id=']", (results) => {
			return results.map((result) => ({
				title: result.textContent,
				url: result.href,
			}));
		});

		return { ...genre, list: genreWithMangas };
	})
);

// const mergedList = [{ id: 1, title: "Manga", list: mangaList }, ...genreList];

// console.log(mergedList);

console.log(test);
await browser.close();
