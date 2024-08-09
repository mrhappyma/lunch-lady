//old imported data is full of \ns that don't show up right in airtable

import Airtable from "airtable";
import env from "./utils/env.js";

const airtable = new Airtable({
  apiKey: env.AIRTABLE_KEY,
}).base("appZ6Cn76GFuSrjdd");

const lunches = airtable("lunch")
  .select()
  .eachPage((r, n) => {
    r.forEach(async (r) => {
      console.log(r.get("lunch"));
      await airtable("lunch").update(r.id, {
        lunch: r.get("lunch")?.toString().replace(/\\n/g, "\n"),
      });
    });
    n();
  });
