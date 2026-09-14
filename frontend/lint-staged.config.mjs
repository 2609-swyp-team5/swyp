const lintStagedConfig = {
    "*.{js,mjs,cjs,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"],
};

export default lintStagedConfig;
