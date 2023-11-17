import "./tailwind.css";

import {
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "@remix-run/react";

export default function App() {
	return (
		<html lang="en">
			<head>
				<title>Micro Frontend RAG Chatbot</title>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<Meta />
				<Links />
			</head>
			<body className="font-roboto">
				<div className="flex flex-col h-full">
					<div className="h-32 bg-dark flex justify-center content-center flex-wrap min-h-[128px]">
						<p className="text-slate-50 relative text-xl">
							Micro Frontend RAG Chatbot
						</p>
					</div>
					<div className="flex-1 bg-dark pt-12 main-background">
						<div className="container h-full mx-auto">
							<Outlet />
						</div>
					</div>
				</div>
				<ScrollRestoration />
				<LiveReload />
				<Scripts />
				<LiveReload />
			</body>
		</html>
	);
}
