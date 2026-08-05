# Manual analysis flow bugfix

- Roll back temporary `layad`-only request restriction.
- Separate instruction copy, ChatGPT opening, result paste, validation, and approval.
- Reject pasted instructions and all-zero template values as invalid analysis results.
- Keep repeated requests allowed according to normal product request behavior.
