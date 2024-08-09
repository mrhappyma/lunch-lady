import Airtable from "airtable";
import puppeteer from "puppeteer";
import env from "./utils/env";
import { importMenu } from "./utils/import-menu";

// check site for new menu
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto("https://www.lancastermennonite.org/lunch-2/");

const menuUrl = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll("a")).find((a) =>
    a.textContent?.toLowerCase().includes("ms & hs lunch menu")
  );
  return a?.href;
});
console.log(menuUrl);
await browser.close();
if (!menuUrl) throw new Error("Menu not found");

const airtable = new Airtable({
  apiKey: env.AIRTABLE_KEY,
}).base("appZ6Cn76GFuSrjdd");
const importedMenus = await airtable("imports")
  .select({
    filterByFormula: `{url} = "${menuUrl}"`,
  })
  .firstPage();

if (!importedMenus.length) {
  await importMenu(menuUrl);
  await airtable("imports").create({
    url: menuUrl,
  });
}

//send the day's lunch to gmail
//date is in the format "YYYY-MM-DD"
const today = new Date().toISOString().split("T")[0];
console.log(today);
const lunch = await airtable("lunch")
  .select({
    filterByFormula: `{date} = "${today}"`,
  })
  .firstPage();
if (!lunch.length) throw new Error("No lunch found for today");

const text = lunch[0].get("lunch");
await fetch(env.WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=UTF-8" },
  body: JSON.stringify({ text }),
});

console.log("Lunch sent!");
