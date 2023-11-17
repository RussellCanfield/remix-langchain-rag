import type { Config } from "tailwindcss";

export default {
	content: ["./app/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			colors: {
				dark: "hsl(240 10% 3.9%)",
				"border-color": "hsl(240 3.7% 15.9%)",
			},
		},
	},
	plugins: [],
} satisfies Config;
