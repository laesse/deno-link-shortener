import { Status } from 'std/http/mod.ts';
import { Application } from 'abc/mod.ts';
import { apiMethodMaker } from './apiMethodMaker.ts';
import { z } from 'zod/mod.ts';
import { cryptoRandomString } from 'crs/mod.ts';
import { DB } from 'sqlite/mod.ts';

const db = new DB('db.db');
db.execute(`
  CREATE TABLE IF NOT EXISTS urlCodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urlCode CHARACTER(10) NOT NULL,
    redirectUrl TEXT NOT NULL
  )
`);
type Row = [string, string];
const getRedirectCode = db.prepareQuery<[string], { redirectUrl: string }, { urlCode: string }>(
  'SELECT redirectUrl FROM urlCodes WHERE urlCode = :urlCode'
);
const findShortUrl = (urlCode: string) => {
  const urlCodes = getRedirectCode.first({ urlCode });
  if (!urlCodes) return null;
  return urlCodes[0];
};

const redirectApp = new Application();

redirectApp
  .get('/:urlCode', (c) => {
    const shortUrl = findShortUrl(c.params.urlCode);

    if (!shortUrl) {
      console.log(`short url ${shortUrl} not found`);
      c.string('Not Found', Status.NotFound);
      return;
    }

    c.redirect(shortUrl, Status.TemporaryRedirect);
  })
  .start({ port: 6969 });

const adminApp = new Application();

adminApp
  .post(
    '/api',
    apiMethodMaker(
      { body: z.object({ originalUrl: z.string() }), params: z.object({}) },
      (ctx, { originalUrl }) => {
        const existingShortUrl = db.query<[string]>(
          'SELECT urlCode FROM urlCodes WHERE redirectUrl = :originalUrl',
          { originalUrl }
        );
        if (existingShortUrl.length > 0) {
          ctx.string(`http://localhost:6969/${existingShortUrl[0][0]}`, Status.OK);
          return;
        }

        const urlCode = cryptoRandomString({ length: 10, type: 'url-safe' });
        const redirectUrl = originalUrl;

        db.query('INSERT INTO urlCodes (urlCode, redirectUrl) VALUES (:urlCode, :redirectUrl)', {
          urlCode,
          redirectUrl,
        });

        ctx.string(`http://localhost:6969/${urlCode}`, Status.Created);
        return;
      }
    )
  )
  .get('/api', () => 'hi')
  .start({ port: 4269 });
