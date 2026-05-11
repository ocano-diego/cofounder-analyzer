import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'CoFounder Analyzer',
    description: 'Instantly score co-founder profiles against your project context.',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel', 'tabs'],
    host_permissions: [
      'https://www.startupschool.org/*',
      'https://api.anthropic.com/*',
      'https://generativelanguage.googleapis.com/*',
    ],
    action: {
      default_title: 'CoFounder Analyzer',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
