import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Conduit',
  description:
    'TypeScript Dependency Injection Framework with Revolutionary Tree-shaking',
  base: 'https://jclyons52.github.io/conduit/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Core Concepts', link: '/guide/concepts' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Tree-shaking Compilation', link: '/guide/compilation' },
            { text: 'CLI Tools', link: '/guide/cli' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Core API',
          items: [
            { text: 'Container', link: '/api/container' },
            { text: 'Service Definitions', link: '/api/service-definitions' },
            { text: 'Lifecycle Scopes', link: '/api/scopes' },
          ],
        },
        {
          text: 'Compilation API',
          items: [
            { text: 'Compiler', link: '/api/compiler' },
            { text: 'CLI Commands', link: '/api/cli' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Usage', link: '/examples/basic' },
            { text: 'Web Application', link: '/examples/web-app' },
            { text: 'Serverless Function', link: '/examples/serverless' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jclyons52/conduit' },
    ],

    editLink: {
      pattern: 'https://github.com/jclyons52/conduit/edit/main/apps/docs/:path',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Conduit Contributors',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    codeTransformers: [
      {
        // Transform code blocks for better highlighting
        postprocess(code) {
          return code.replace(/\[!code highlight\]/g, '');
        },
      },
    ],
  },
});
