// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  intro: [
    'intro/index',
    'intro/features',
    'intro/tech-stack',
  ],
  architecture: [
    'architecture/overview',
    'architecture/backend',
    'architecture/frontend',
    'architecture/database',
    'architecture/auth',
  ],
  modules: [
    'modules/crm',
    'modules/approval',
    'modules/hrm',
    'modules/psi',
    'modules/finance',
    'modules/ai',
    'modules/system',
    'modules/cms',
  ],
  deployment: [
    'deployment/overview',
    'deployment/server',
    'deployment/admin',
    'deployment/cms',
    'deployment/mobile',
  ],
};

export default sidebars;
