import { useState, useMemo } from "react";
import ChatMessage from "../components/ChatMessage";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import type { Message } from "../types/ChatMessage";

let abortController: AbortController | undefined;

const Home = () => {
	const [lastMessage, setLastMessage] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);

	const handleChatMessage = (
		event: React.KeyboardEvent<HTMLTextAreaElement>
	) => {
		if (event.key === "Enter") {
			event.preventDefault();

			let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
			const prompt = event.currentTarget.value;

			if (abortController) {
				abortController.abort();

				setMessages((oldMessages) => [
					...oldMessages,
					{
						from: "bot",
						message:
							"Sorry, let me know if you have another question that I can help you with.",
					},
				]);
			}

			setMessages((oldMessages) => [
				...(oldMessages ?? []),
				{
					from: "me",
					message: prompt,
				},
			]);

			setLoading(true);

			abortController = new AbortController();

			fetch(`/chat?prompt=${prompt}`, { signal: abortController.signal })
				.then((response) => {
					abortController = undefined;
					setLoading(false);
					reader = response.body!.getReader();

					let data = "";

					const readStream = async () => {
						const { done, value } = await reader!.read();

						if (done) {
							setMessages((oldMessages) => [
								...oldMessages,
								{
									from: "bot",
									message: data,
								},
							]);
							setLastMessage(null);
							reader?.releaseLock();
							return;
						}

						data += new TextDecoder("utf-8").decode(value);
						setLastMessage(data);
						readStream();
					};

					readStream();
				})
				.catch((error) => {
					if (error.name === "AbortError") {
						return;
					}
				});

			event.currentTarget.value = "";
		}
	};

	const chatMessages = useMemo(() => {
		return messages.map(({ from, message }, index) => (
			<li key={index}>
				<ChatMessage from={from} message={message} />
			</li>
		));
	}, [messages]);

	return (
		<div className="rounded-md shadow-md h-5/6 flex flex-col">
			<ul className="flex-1 overflow-auto bg-gradient-to-r from-zinc-950 to-zinc-900 border-2 border-border-color">
				{chatMessages}
				{lastMessage && (
					<li style={{ whiteSpace: "pre-line" }}>
						<ChatMessage from="bot" message={lastMessage} />
					</li>
				)}
				{loading && (
					<div className="chat-message bg-zinc-800 text-white">
						<div className="skeleton"></div>
						<div className="skeleton animation"></div>
					</div>
				)}
			</ul>
			<div className="h-16">
				<textarea
					name="prompt"
					placeholder="Enter your question here..."
					className="chat-input rounded-md pl-6 pr-6 pt-2 pb-2"
					onKeyDownCapture={handleChatMessage}
					autoFocus
				/>
			</div>
		</div>
	);
};

export default Home;
