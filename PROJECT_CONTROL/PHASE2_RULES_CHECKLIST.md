# Workforce V2 Phase 2 — Rule Checklist

## Hard constraints
- [ ] Active employee only
- [ ] Store eligibility enforced
- [ ] Availability fully contains assignment
- [ ] UNAVAILABLE overlap blocks assignment
- [ ] No assignment overlap
- [ ] Daily hours cap
- [ ] Weekly hours cap
- [ ] Minimum rest
- [ ] Skill code/level qualification
- [ ] Mentor requirement
- [ ] Staffing minimum coverage
- [ ] Staffing maximum coverage
- [ ] Final validation before review/publish

## Soft objectives
- [ ] Minimum coverage first
- [ ] Skill coverage
- [ ] Target coverage
- [ ] Preferred store
- [ ] Preferred availability
- [ ] Weekly-hour balance
- [ ] Store-change reduction
- [ ] Split-assignment reduction
- [ ] Labor-cost tie-break

## Determinism
- [ ] No random tie-break
- [ ] No database physical row-order dependence
- [ ] Stable requirement key
- [ ] Stable user/order tie-break
- [ ] Algorithm version recorded

## Coverage
- [ ] Interval/sub-interval evaluation
- [ ] UNDER_MINIMUM
- [ ] TARGET_MET
- [ ] PARTIAL
- [ ] OVER_MAXIMUM
