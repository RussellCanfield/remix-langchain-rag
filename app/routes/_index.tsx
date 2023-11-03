import { useState, useMemo, memo } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

type Senders = "me" | "bot";

type ChatMessage = {
	from: Senders;
	message: string;
};

const Home = () => {
	const [lastMessage, setLastMessage] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
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
				{
					from: "me",
					message: prompt,
				},
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
			});

			event.currentTarget.value = "";
		}
	};

	const ChatMessage = memo(({ from, message }: ChatMessage) => {
		return (
			<Markdown
				children={`${from === "bot" ? "Bot: " : "Me: "} ${message}`}
				className={`chat-message ${
					from === "bot"
						? "bg-slate-800 text-white"
						: "bg-slate-400 text-white"
				}`}
				components={{
					p(props) {
						const { children, className, node, ...rest } = props;

						//Special handling because I'm giving it a specific format.
						const isVideo = /v=(\w+)/.exec(String(children) || "");

						console.log(isVideo);

						if (isVideo) {
							return (
								<LiteYouTubeEmbed
									id={isVideo[1]}
									title={""}
								></LiteYouTubeEmbed>
							);
						} else {
							return <p>{children}</p>;
						}
					},
					code(props) {
						const { children, className, node, ...rest } = props;

						const languageType = /language-(\w+)/.exec(
							className || ""
						);

						if (languageType) {
							return (
								<SyntaxHighlighter
									children={String(children).replace(
										/\n$/,
										""
									)}
									style={dracula}
									language={languageType[1]}
								/>
							);
						} else {
							return (
								<SyntaxHighlighter
									children={String(children).replace(
										/\n$/,
										""
									)}
									style={dracula}
									language={""}
								/>
							);
						}
					},
				}}
			/>
		);
	});

	const chatMessages = useMemo(() => {
		return messages.map(({ from, message }, index) => (
			<li key={index}>
				<ChatMessage from={from} message={message} />
			</li>
		));
	}, [messages]);

	return (
		<div className="rounded-md bg-slate-100 shadow-md h-5/6 flex flex-col">
			<ul className="flex-1 overflow-auto bg-slate-500 border-2 border-slate-400">
				{chatMessages}
				{lastMessage && (
					<li style={{ whiteSpace: "pre-line" }}>
						<ChatMessage from="bot" message={lastMessage} />
					</li>
				)}
				{loading && (
					<div className="chat-message bg-slate-800 text-white">
						<div className="skeleton skeleton-text"></div>
					</div>
				)}
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
