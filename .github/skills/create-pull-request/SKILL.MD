name: create-pull-request
description: Extract code changes and commit messages to generate Pull Request content following WeCheer standard template.


# Instructions for Create Pull Request Skill

When a user requests to create a Pull Request or draft PR content, follow these steps:

1. **Information Gathering:**
   - Scan the latest commit messages and changed files (diff) in the current branch.
    - Search for Jira ticket code (e.g., WEE-123) in the branch name or commit messages.
    - For PR title:
       - If the branch name contains a Jira ticket (e.g., WEE-123), set the PR title as `[Jira Ticket ID]: [Summary]`.
       - If no Jira ticket is found, set the PR title as `[Summary]` (do not use the prefix 'Jira ticket:').

2. **Content Generation:**
   - Always present in **English** using the format below.
   - The "What I Have Changed" section must be based on actual code logic analysis, not fabricated.



## Pull Request Template

**Title:**
`[Jira Ticket ID]: [Summary]` (if branch name contains Jira ticket)
`[Summary]` (if branch name does not contain Jira ticket)

### Description:
Please provide a clear and concise description of the problem or feature addressed by this pull request. Add context or background information if needed.

### What I Have Changed:
*Describe in detail the changes made in this pull request. This can include code changes, configuration updates, or other modifications.*

* **High-level overview:** [Agent: Summarize the most important changes and list the main files].
* **Technical details:** [Agent: Mention changes in logic, algorithms, or technical considerations for reviewers].
* **Code Snippets:** [Agent: Quote the most important code snippets if there are major changes].

### Configuration Changes (if applicable):
*List any configuration changes that need to be made or updated (e.g., JSON files, environment variables).*

### Evidence (Screenshots or Logs):
*Include screenshots, log output, or any other evidence that helps illustrate and verify the changes.*
*(Note: Manual input required from developer)*

### Outcome success metric events:
How the success of the feature will be measured with the events created.

### Additional Notes:
Any additional information, potential challenges, trade-offs, or testing steps that reviewers should know.


## Standard Commit Messages Reference:
When suggesting or reviewing commits, prioritize the following formats:
- rename parameters
- update tracking id
- update short link parameters
- fix unit tests

*This section should be a list of all commit messages included in the current change. Extract and display each commit message from the branch being merged.*