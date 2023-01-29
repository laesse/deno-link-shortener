import { Status } from 'std/http/mod.ts';
import { Application } from 'abc/mod.ts';
import { apiMethodMaker } from './apiMethodMaker.ts';
import { z } from 'zod/mod.ts';
import { cryptoRandomString } from 'crs/mod.ts';

const urlCodes = new Map<string, string>();
urlCodes.set('gg', 'https://google.com');

const findShortUrl = (urlCode: string) => {
  if (urlCodes.has(urlCode)) return urlCodes.get(urlCode);
  return null;
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
      (ctx, body) => {
        const existingShortUrl = [...urlCodes].find(
          ([_code, redirectUrl]) => body.originalUrl === redirectUrl
        );
        if (existingShortUrl) {
          ctx.string(`http://localhost:6969/${existingShortUrl[0]}`, Status.OK);
          return;
        }

        const urlCode = cryptoRandomString({ length: 10, type: 'url-safe' });
        const shortUrl = body.originalUrl;
        urlCodes.set(urlCode, shortUrl);

        ctx.string(`http://localhost:6969/${urlCode}`, Status.Created);
        return;
      }
    )
  )
  .get('/api', () => 'hi')
  .start({ port: 4269 });
