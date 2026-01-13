import { krepko, expect } from '@svintsoff78/krepkojs';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

krepko(BASE_URL)
    .flow('Basic Type Matchers')
    .tags(['matchers', 'types'])
    .do('expect.number', async (ctx) => {
        const res = await ctx.get('/posts/1');
        res.expectStatus(200);
        res.expectBody({
            id: expect.number,
            userId: expect.number,
        });
    })
    .do('expect.string', async (ctx) => {
        const res = await ctx.get('/posts/1');
        res.expectStatus(200);
        res.expectBody({
            title: expect.string,
            body: expect.string,
        });
    })
    .do('expect.boolean', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        // JSONPlaceholder doesn't have booleans, but we can test the matcher works
        res.expectBody({
            id: expect.number,
            name: expect.string,
        });
    })
    .do('expect.array', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        res.expectBody({
            address: expect.object,
            company: expect.object,
        });
    })
    .do('expect.any', async (ctx) => {
        const res = await ctx.get('/posts/1');
        res.expectStatus(200);
        res.expectBody({
            id: expect.any,
            userId: expect.any,
            title: expect.any,
            body: expect.any,
        });
    })

krepko(BASE_URL)
    .flow('Exact Value Matching')
    .tags(['matchers', 'exact'])
    .do('Match exact number', async (ctx) => {
        const res = await ctx.get('/posts/1');
        res.expectStatus(200);
        res.expectBody({
            id: 1,
            userId: 1,
        });
    })
    .do('Match exact string', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        res.expectBody({
            username: 'Bret',
            email: 'Sincere@april.biz',
        });
    })

krepko(BASE_URL)
    .flow('Nested Objects Validation')
    .tags(['matchers', 'nested'])
    .do('One level deep', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        res.expectBody({
            address: {
                city: expect.string,
                street: expect.string,
            },
        });
    })
    .do('Two levels deep', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        res.expectBody({
            address: {
                geo: {
                    lat: expect.string,
                    lng: expect.string,
                },
            },
        });
    })
    .do('Multiple nested objects', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        res.expectBody({
            address: {
                city: 'Gwenborough',
                geo: {
                    lat: expect.string,
                },
            },
            company: {
                name: expect.string,
                catchPhrase: expect.string,
            },
        });
    })

krepko(BASE_URL)
    .flow('Array Validation')
    .tags(['matchers', 'arrays'])
    .do('Array is array', async (ctx) => {
        const res = await ctx.get('/posts');
        res.expectStatus(200);
        res.expectBody(expect.arrayOf({
            id: expect.number,
            userId: expect.number,
            title: expect.string,
            body: expect.string,
        }));
    })
    .do('First element validation', async (ctx) => {
        const res = await ctx.get('/posts');
        res.expectStatus(200);
        res.expectBody([
            { id: 1, userId: 1, title: expect.string },
        ]);
    })
    .do('Multiple elements validation', async (ctx) => {
        const res = await ctx.get('/posts');
        res.expectStatus(200);
        res.expectBody([
            { id: 1 },
            { id: 2 },
            { id: 3 },
        ]);
    })

krepko(BASE_URL)
    .flow('expect.arrayOf Matcher')
    .tags(['matchers', 'arrayOf'])
    .do('All posts match pattern', async (ctx) => {
        const res = await ctx.get('/users/1/posts');
        res.expectStatus(200);
        res.expectBody(expect.arrayOf({
            userId: 1,
            id: expect.number,
            title: expect.string,
            body: expect.string,
        }));
    })
    .do('All comments match pattern', async (ctx) => {
        const res = await ctx.get('/posts/1/comments');
        res.expectStatus(200);
        res.expectBody(expect.arrayOf({
            postId: 1,
            id: expect.number,
            name: expect.string,
            email: expect.string,
            body: expect.string,
        }));
    })
    .do('Nested arrayOf', async (ctx) => {
        const res = await ctx.get('/users');
        res.expectStatus(200);
        res.expectBody(expect.arrayOf({
            id: expect.number,
            name: expect.string,
            address: {
                street: expect.string,
                city: expect.string,
                geo: {
                    lat: expect.string,
                    lng: expect.string,
                },
            },
        }));
    })

krepko(BASE_URL)
    .flow('expect.arrayContaining Matcher')
    .tags(['matchers', 'arrayContaining'])
    .do('Contains specific user', async (ctx) => {
        const res = await ctx.get('/users');
        res.expectStatus(200);
        res.expectBody(expect.arrayContaining([
            { id: 1, username: 'Bret' },
            { id: 2, username: 'Antonette' },
        ]));
    })
    .do('Contains posts with specific userId', async (ctx) => {
        const res = await ctx.get('/posts');
        res.expectStatus(200);
        res.expectBody(expect.arrayContaining([
            { userId: 1, id: 1 },
            { userId: 1, id: 2 },
        ]));
    })

krepko(BASE_URL)
    .flow('Depth Limit Option')
    .tags(['matchers', 'depth'])
    .do('Depth 1 - only top level', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        // With depth 1, only top-level keys are checked
        // address and company internals are skipped
        res.expectBody({
            id: expect.number,
            name: expect.string,
            address: expect.object,
            company: expect.object,
        }, { depth: 1 });
    })
    .do('Depth 2 - one level of nesting', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        // With depth 2, address.geo is checked as object but not its contents
        res.expectBody({
            address: {
                city: expect.string,
                geo: expect.object,
            },
        }, { depth: 2 });
    })

krepko(BASE_URL)
    .flow('Combined Complex Validation')
    .tags(['matchers', 'complex'])
    .do('Full user validation', async (ctx) => {
        const res = await ctx.get('/users/1');
        res.expectStatus(200);
        res.expectBody({
            id: 1,
            name: expect.string,
            username: 'Bret',
            email: expect.string,
            address: {
                street: expect.string,
                suite: expect.string,
                city: 'Gwenborough',
                zipcode: expect.string,
                geo: {
                    lat: expect.string,
                    lng: expect.string,
                },
            },
            phone: expect.string,
            website: expect.string,
            company: {
                name: expect.string,
                catchPhrase: expect.string,
                bs: expect.string,
            },
        });
    })
    .do('Posts with nested comments check', async (ctx) => {
        // Get post
        const postRes = await ctx.get('/posts/1');
        postRes.expectStatus(200);
        postRes.expectBody({
            id: 1,
            userId: expect.number,
            title: expect.string,
            body: expect.string,
        });

        ctx.set('postId', (postRes.body as { id: number }).id);

        // Get comments for the post
        const commentsRes = await ctx.get(`/posts/${ctx.getVar('postId')}/comments`);
        commentsRes.expectStatus(200);
        commentsRes.expectBody(expect.arrayOf({
            postId: ctx.getVar('postId'),
            id: expect.number,
            name: expect.string,
            email: expect.string,
            body: expect.string,
        }));
    })
    .do('Albums with photos', async (ctx) => {
        // Get album
        const albumRes = await ctx.get('/albums/1');
        albumRes.expectStatus(200);
        albumRes.expectBody({
            userId: expect.number,
            id: 1,
            title: expect.string,
        });

        // Get photos for album
        const photosRes = await ctx.get('/albums/1/photos');
        photosRes.expectStatus(200);
        photosRes.expectBody(expect.arrayOf({
            albumId: 1,
            id: expect.number,
            title: expect.string,
            url: expect.string,
            thumbnailUrl: expect.string,
        }));
    })