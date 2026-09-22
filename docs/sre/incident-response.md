# Incident response

## Severity

| Sev | Meaning | Example | Response |
| --- | --- | --- | --- |
| 1 | Coaches cannot use My Path | API down, all uploads fail | Page. Incident commander within 15 minutes. |
| 2 | Major feature degraded | Drafting stuck, p95 above 2 s | Page during business hours. |
| 3 | Minor or workaround exists | High AI fallback rate | Ticket, next business day. |

## Roles

- **Incident commander (IC):** coordinates, decides, and keeps the timeline. Does not debug.
- **Operations lead:** investigates and mitigates.
- **Communications lead:** updates coaches and stakeholders every 30 minutes (Sev 1) or hourly (Sev 2).

## Steps

1. **Declare:** open an incident channel, name the IC, and set the severity.
2. **Mitigate first:** roll back, scale up, or switch `MY_PATH_DRAFTER=template`. Restore service
   before finding the root cause.
3. **Communicate:** state what is affected, what we are doing, and when the next update comes.
4. **Resolve:** confirm SLIs are back to normal for 30 minutes.
5. **Learn:** write a blameless [postmortem](postmortem-template.md) within 5 business days for
   Sev 1–2, or for anything that used more than 20% of the monthly error budget.
