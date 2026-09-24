# Security policy

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's
[private vulnerability reporting](../../security/advisories/new) for this repository. We aim to
acknowledge reports within 3 business days.

## Data handling

- My Path runs on **synthetic data only**. Never upload real student records.
- A pilot requires ASU privacy and FERPA review, approved hosting and a model endpoint that
  does not retain data.
- The LLM receives only the structured fields that triggered a flag, never free text.

## Supply chain

- Dependencies are locked (`uv.lock`, `package-lock.json`) and updated weekly by Dependabot.
- GitHub Actions are pinned to full commit SHAs, so a moved or hijacked tag cannot change
  what CI runs. Dependabot bumps the SHA and its `# vX.Y.Z` comment together.
- CI runs `pip-audit`, `npm audit`, CodeQL, gitleaks and Trivy image scans.
- Release images are built with SBOM + provenance and signed keylessly with Sigstore cosign.
  Verify with:
  `cosign verify ghcr.io/kgervin/my-path-api@<digest> --certificate-identity-regexp 'https://github.com/kgervin/my-path/.*' --certificate-oidc-issuer https://token.actions.githubusercontent.com`
