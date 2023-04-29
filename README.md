# Check Commit Conditions

Use this action to check a push or pull request for certain conditions.

Conditions that can be checked are :
- The existance of a string in the commit message.
- Whether there are changed files or not after excludes and includes filters are applied to the list of changed files in the commit / pull request.

The action will output true or false based on these conditions, which can be used in subsequence workflow steps.

# Inputs / Outputs

See [action.yml](action.yml)

## Inputs

| Name  | Description | 
|------ |-------------|
| token | Token to use for authentication, defaults to GITHUB_TOKEN |
| success-commit-message | action outputs true if commit message contains this string |
| fail-commit-message | action outputs false if commit message contains this string |
| excludes | Comma separated list of file paths to exclude from check. Accepts glob patterns.
| includes | Comma separated list of file paths to include in check. Accepts glob patterns.
| approve  | If the event is a pull request, setting this to true will auto approve the PR if the condition is true
| approveMessage  | Message to add to the approval if approve setting is set to true.

## Outputs

| Name   | Description |
|--------|-------------|
| result | The result of the above checks, true or false |

# Examples

```yaml
- name: Check commit for release conditions
  id: is-release-required
  uses: steviemul/commit-conditions@v1.0.0
  with:
    success-commit-message: '[release]'
    fail-commit-message: '[skip release]'
    excludes: >
      .github/workflows/*.yml,
      README.md

- name: Check Release Required
  run: |
    echo 'Release result is ${{ steps.is-release-required.outputs.result }}'
```



