# Error budget policy

The availability SLO is 99.5% over 28 days (see [SLOs](slos.md)).

| Budget left | What we do |
| --- | --- |
| > 50% | Ship normally. |
| 25–50% | Releases need a named rollback plan; prefer small changes. |
| < 25% | Feature freeze for risky changes. Reliability work gets priority. |
| Exhausted | Only fixes for reliability and security ship until the budget recovers. |

A single incident that uses more than 20% of the budget needs a postmortem with at least one
action item to prevent it happening again. The product owner and engineering lead review this
policy each quarter.
