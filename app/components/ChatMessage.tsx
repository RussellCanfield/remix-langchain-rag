import { memo } from "react";
import { type Message } from "../types/ChatMessage";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import LiteYouTubeEmbed from "react-lite-youtube-embed";

const ChatMessage = memo(({ from, message }: Message) => {
	return (
		<div className="flex mb-2 items-start gap-4 p-4">
			{from === "me" && (
				<span className="rounded-[50%] h-[50px] w-[50px] bg-slate-100 leading-[3em] text-center">
					Me
				</span>
			)}
			<Markdown
				children={message}
				className={
					"chat-message text-white border-border-color rounded-md border-2 flex-1"
				}
				components={{
					p(props) {
						const { children, className, node, ...rest } = props;

						//Special handling because I'm giving it a specific format.
						const hasVideo = /v=(\w+)/.exec(String(message) || "");

						return (
							<>
								<p className="text-white">{children}</p>
								{hasVideo && (
									<LiteYouTubeEmbed
										id={hasVideo[1]}
										title={""}
									></LiteYouTubeEmbed>
								)}
							</>
						);
					},
					code(props) {
						const { children, className, node, ...rest } = props;

						const languageType = /language-(\w+)/.exec(
							className || ""
						);

						return (
							<SyntaxHighlighter
								children={String(children).replace(/\n$/, "")}
								style={dracula}
								language={languageType ? languageType[1] : ""}
							/>
						);
					},
				}}
			/>
			{from === "bot" && (
				<span className="rounded-[50%] h-[50px] w-[50px] bg-slate-100 leading-[3em] text-center">
					Bot
				</span>
			)}
		</div>
	);
});

export default ChatMessage;
