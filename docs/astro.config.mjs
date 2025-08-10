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
						{ label: 'Context', link: '/concepts/context' },
						{ label: 'Styling', link: '/concepts/styling' },
						{ label: 'Routing', link: '/concepts/routing' }
					]
				},
				{
					label: 'Learn',
					items: [
						{ label: 'Quick Start', link: '/learn/quick-start' },
						{ label: 'Todo Tutorial', link: '/learn/todo-tutorial' },
						// { label: 'Real World App', link: '/learn/real-world-app' },
					]
				},
				{
					label: 'Packages',
					items: [
						{ label: 'core', autogenerate: { directory: 'packages/core' } },
						{ label: 'dom', autogenerate: { directory: 'packages/dom' } },
						{ label: 'css', autogenerate: { directory: 'packages/css' } },
						{ label: 'resource', autogenerate: { directory: 'packages/resource' } },
						{ label: 'router', autogenerate: { directory: 'packages/router' } },
						{ label: 'store', autogenerate: { directory: 'packages/store' } },
					]
				},
				{ label: 'Plugins', link: '/plugins' },
			]
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});