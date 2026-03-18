# TODO.md

## Active backlog

### Technical debt — Route file sizes

Several route files exceed 700 lines and handle many endpoints. They are readable but could be split by resource sub-type if they grow further:
- `appointmentRoutes.ts` (870 lines) — could split occurrences into `occurrenceRoutes.ts`
- `householdRoutes.ts` (797 lines) — could split member management into `memberRoutes.ts`
- `displayTabletRoutes.ts` (773 lines) — could split config/SSE into `tabletConfigRoutes.ts`

Not urgent while individual endpoints stay focused, but worth tracking.

---

## Ideas backlog

See `IDEAS.md` for product and technical directions not yet scheduled.
