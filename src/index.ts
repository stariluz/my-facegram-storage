/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Check requests for a pre-shared secret
const hasValidHeader = (request:any, env:any) => {
	return request.headers.get('X-Custom-Auth-Key') === env.AUTH_KEY_SECRET;
};

function authorizeRequest(request:any, env:any, key:any) {
	switch (request.method) {
		case 'PUT':
		case 'DELETE':
			return hasValidHeader(request, env);
		default:
			return false;
	}
}

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		const key = url.pathname.slice(1);
	
		if (!authorizeRequest(request, env, key)) {
		  return new Response('Forbidden', { status: 403 });
		}	

		switch (request.method) {
			case 'PUT':
				await env.BUCKET.put(key, request.body);
				return new Response(`Put ${key} successfully!`);
			case 'GET':
				const object = await env.BUCKET.get(key);

				if (object === null) {
					return new Response('Object Not Found', { status: 404 });
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set('etag', object.httpEtag);

				return new Response(object.body, {
					headers,
				});
			case 'DELETE':
				await env.BUCKET.delete(key);
				return new Response('Deleted!');

			default:
				return new Response('Method Not Allowed', {
					status: 405,
					headers: {
						Allow: 'PUT, GET, DELETE',
					},
				});
		}
	},
} satisfies ExportedHandler<Env>;
