// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	integrations: [
		starlight({
			title: 'HellaJS',
			logo: {
				src: '/public/favicon.svg',
				alt: 'HellaJS Logo',
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/omilli/hellajs' }],
			customCss: ['./src/styles/global.css'],
			sidebar: [
				{ label: 'Overview', link: '/' },
				{
					label: 'Concepts',
					items: [
						{ label: 'Reactivity', link: '/concepts/reactivity' },
						{ label: 'Templates', link: '/concepts/templates' },
						{ label: 'Styling', link: '/concepts/styling' },
						{ label: 'Routing', link: '/concepts/routing' },
						{ label: 'JSX', link: '/concepts/jsx' }
					]
				},
				{
					label: 'Learn',
					items: [
						{ label: 'Quick Start', link: '/learn/quick-start' },
						{ label: 'Todo Tutorial', link: '/learn/todo-tutorial' },
					]
				},
				{
					label: 'Packages',
					autogenerate: { directory: 'packages' }
				},
				{ label: 'Plugins', autogenerate: { directory: 'plugins' } },
			]
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});