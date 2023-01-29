import { Status } from 'std/http/http_status.ts';
import { Context } from 'abc/context.ts';
import { HandlerFunc } from 'abc/types.ts';
import { z } from 'zod/mod.ts';

type Options<TBody extends z.ZodType, TParams extends z.ZodType> = {
  body: TBody;
  params: TParams;
};
export const apiMethodMaker =
  <TBody extends z.ZodType, TParams extends z.ZodType>(
    opts: Options<TBody, TParams>,
    cb: (ctx: Context, body: z.infer<TBody>, params: z.infer<TParams>) => void
  ): HandlerFunc =>
  async (ctx) => {
    const body = opts.body.safeParse(await ctx.body);
    if (!body.success) {
      console.log(`body parse error`, body.error);
      ctx.string(`body parse error`, Status.BadRequest);
      return;
    }
    const params = opts.params.safeParse(ctx.params);
    if (!params.success) {
      console.log(`params parse error`, params.error);
      ctx.string(`params parse error`, Status.BadRequest);
      return;
    }
    cb(ctx, body.data, params.data);
  };
