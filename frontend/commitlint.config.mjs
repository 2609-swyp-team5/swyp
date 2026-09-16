const commitlintConfig = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "header-max-length": [2, "always", 50],
        "subject-empty": [2, "never"],
        "subject-full-stop": [2, "never", "."],
        "type-enum": [2, "always", ["feat", "fix", "docs", "style", "refactor", "test", "chore"]],
    },
};

export default commitlintConfig;
