import { useState } from "react";

const Home = () => {
	const [lastMessage, setLastMessage] = useState<string | null>(null);
	const [messages, setMessages] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);

	const handleChatMessage = (
		event: React.KeyboardEvent<HTMLTextAreaElement>
	) => {
		if (event.key === "Enter") {
			event.preventDefault();

			let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
			const prompt = event.currentTarget.value;

			setMessages((oldMessages) => [
				...(oldMessages ?? []),
				`Me: ${prompt}`,
			]);

			setLoading(true);

			fetch(`/chat?prompt=${prompt}`).then((response) => {
				setLoading(false);
				reader = response.body!.getReader();

				let data = "";

				const readStream = async () => {
					const { done, value } = await reader!.read();

					if (done) {
						setMessages((oldMessages) => [
							...oldMessages,
							`MFE Helper: ${data}`,
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
			});
		}
	};

	return (
		<div className="rounded-md bg-slate-100 shadow-md h-5/6 flex flex-col">
			<ul className="p-6 flex-1">
				{messages.map((message, index) => (
					<li key={index}>{message}</li>
				))}
				{lastMessage && <li>{lastMessage}</li>}
				{loading && <div className="skeleton skeleton-text"></div>}
			</ul>
			<div className="h-16">
				<textarea
					name="prompt"
					placeholder="Enter your question here..."
					className="chat-input rounded-md pl-6 pr-6 pt-2 pb-2"
					onKeyDownCapture={handleChatMessage}
				/>
			</div>
		</div>
	);
};

export default Home;
