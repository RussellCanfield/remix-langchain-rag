import {
	unstable_createViteServer,
	unstable_loadViteServerBuild,
} from "@remix-run/dev";
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import { Ollama } from "./app/lang/model/Ollama";
import { createOpenApiExecutor } from "./app/lang/executor/OpenApiExecutor";

installGlobals();

const vite =
	process.env.NODE_ENV === "production"
		? undefined
		: await unstable_createViteServer();

const app = express();

// handle asset requests
if (vite) {
	app.use(vite.middlewares);
} else {
	app.use(
		"/build",
		express.static("public/build", {
			immutable: true,
			maxAge: "1y",
		})
	);
}
app.use(express.static("public", { maxAge: "1h" }));

app.get("/chat", async (req, res) => {
	const { prompt } = req.query;

	const model = new Ollama({
		model: "zephyr",
		temperature: 0,
		p: 0.1,
		k: 30,
		baseUrl: "http://localhost:11434",
	});

	const executor = await createOpenApiExecutor(
		"http://localhost:5012/swagger/v1/swagger.json",
		model
	);

	try {
		const stream = await executor.execute(String(prompt));

		const decoder = new TextDecoder("utf-8");

		for await (const chunk of stream) {
			const text = decoder.decode(chunk, { stream: true });
			try {
				const { response } = JSON.parse(text);
				res.write(response);
			} catch (error) {
				console.error("STREAM ERROR: ", text);
			}
		}

		res.status(200);
		res.end();
	} catch (error) {
		const apiError = error as Error;
		console.error("ERROR: ", apiError);
		res.write(`Error: ${apiError.message}`);
		res.status(500);
	}
});

// handle SSR requests
app.all(
	"*",
	createRequestHandler({
		build: vite
			? () => unstable_loadViteServerBuild(vite)
			: //@ts-ignore
			  await import("./build/index.js"),
	})
);

const port = 3000;
app.listen(port, () => console.log("http://localhost:" + port));
