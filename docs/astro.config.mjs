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
				{
					label: 'Learn',
					items: [
						{ label: 'Overview', link: '/' },
						{
							label: 'Concepts',
							items: [
								{ label: 'Reactivity', link: '/concepts/reactivity' },
								{ label: 'Templates', link: '/concepts/templates' },
								{ label: 'Components', link: '/concepts/components' },
								{ label: 'Styling', link: '/concepts/styling' },
								{ label: 'State Management', link: '/concepts/state-management' },
								{ label: 'Routing', link: '/concepts/routing' },
								{ label: 'Data Fetching', link: '/concepts/data-fetching' },
								{ label: 'Performance', link: '/concepts/performance' },
								{ label: 'Architecture', link: '/concepts/architecture' },
								{ label: 'JSX', link: '/concepts/jsx' }
							]
						},
						{
							label: 'Guides',
							items: [
								{
									label: 'Getting Started',
									items: [
										{ label: 'Quick Start', link: '/learn/quick-start' },
										{ label: 'Todo Tutorial', link: '/learn/todo-tutorial' },
										{ label: 'Project Structure', link: '/guides/getting-started/project-structure' },
										{ label: 'Best Practices', link: '/guides/getting-started/best-practices' },
									]
								},
								{
									label: 'Patterns',
									items: [
										{ label: 'Component Patterns', link: '/guides/patterns/component-patterns' },
										{ label: 'State Patterns', link: '/guides/patterns/state-patterns' },
										{ label: 'Async Patterns', link: '/guides/patterns/async-patterns' },
										{ label: 'Error Patterns', link: '/guides/patterns/error-patterns' },
									]
								},
								{
									label: 'Performance',
									items: [
										{ label: 'Optimization', link: '/guides/performance/optimization' },
										{ label: 'Debugging', link: '/guides/performance/debugging' },
										{ label: 'Memory Management', link: '/guides/performance/memory-management' },
									]
								},
								{
									label: 'Testing',
									items: [
										{ label: 'Unit Testing', link: '/guides/testing/unit-testing' },
										{ label: 'Integration Testing', link: '/guides/testing/integration-testing' },
										{ label: 'Mocking', link: '/guides/testing/mocking' },
									]
								},
								{
									label: 'Migration',
									items: [
										{ label: 'From React', link: '/guides/migration/from-react' },
										{ label: 'From SolidJS', link: '/guides/migration/from-solid' },
										{ label: 'From Vue', link: '/guides/migration/from-vue' },
									]
								},
							]
						},
					]
				},
				{
					label: 'Reference',
					items: [
						{
							label: 'API Reference',
							autogenerate: { directory: 'packages' }
						},
						{
							label: 'Plugins',
							autogenerate: { directory: 'plugins' }
						},
					]
				},
				{
					label: 'Internals',
					autogenerate: { directory: 'internals' }
				}
			]
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});