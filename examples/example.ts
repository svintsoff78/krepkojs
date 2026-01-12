import { krepko, expect } from 'krepko';

const BASE_URL = 'http://localhost:9000';

krepko(BASE_URL)
    .flow('Authentication and Authorization')
    .tags(['critical', 'auth'])
    .do('Authenticate user', async (ctx) => {
        const res = await ctx.post('/admin/auth/auth-by-password', { phone: '+79999999999', password: 'password' });

        res.expectStatus(200);
        res.expectBody({ token: expect.string });

        ctx.bearer(res.body.token)
    })
    .do('Check authorization', async (ctx) => {
        const res = await ctx.get('/admin/automation/installations');

        res.expectStatus(200);
    })