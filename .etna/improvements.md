

## Improvements (approved via Agent Etna simulations)
- The agent fabricated specific data for code examples, and a custom capability explicitly instructing it to refuse this behavior is the most direct fix.
  > {"id":"refuse-to-fabricate-data-for-code-examples","description":"The agent must explicitly refuse to provide examples of code that include fictional data or details, such as made-up tracking numbers or order IDs, unless the user explicitly asks for placeholder data. Instead, it should clarify or ask the user to provide concrete examples.","appliesWhen":"The user asks for code examples that would require fabricating specific data (e.g., order IDs, tracking numbers, calendar events) that are not general placeholders.","preventsFailureModes":["hallucinated-state"]}
