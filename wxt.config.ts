import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'YC Co-Founder Analyzer',
    description: 'Instantly score YC co-founder profiles against your project context.',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel', 'tabs'],
    host_permissions: [
      'https://www.startupschool.org/*',
      'https://api.anthropic.com/*',
      'https://generativelanguage.googleapis.com/*',
    ],
    action: {
      default_title: 'YC Co-Founder Analyzer',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
