# PageWork Pro — Firestore Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **Zero Self-Promotion**: Standard users can never set `role: "admin"`, `trainingVerified: true`, `trainingStatus: "verified"`, or credit their own `wallets/{uid}` balance.
2. **PII Isolation**: `users/{uid}` and `payment_methods/{uid}` are readable ONLY by the document owner (`request.auth.uid == uid`) or a verified Admin. Non-PII referral lookups go exclusively through `referral_codes/{code}`.
3. **Database-Level Global Link Uniqueness**: `global_facebook_pages/{canonicalKey}` allows creation ONLY when `!exists(...)` and `ownerUserId == request.auth.uid`; updates and deletes are Admin-only, making duplicate Facebook Page submissions impossible across all users.
4. **Wallet Conservation Invariant**: Users can initialize their own wallet strictly at zero (`0`) and may only move funds from `availableBalance` to `reservedBalance` during withdrawal requests where `incoming().availableBalance + incoming().reservedBalance == existing().availableBalance + existing().reservedBalance` and `incoming().availableBalance >= 0`. All balance credits (`totalSalaryIncome`, `totalAffiliateIncome`, `availableBalance` increases) are strictly Admin-only.
5. **Terminal State Locking**: Once a `training_purchases`, `withdrawal_requests`, or `weekly_verifications` document reaches a terminal approved/paid state, standard users cannot mutate it.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps on user writes must strictly equal `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Admin Escalation**: `users/{uid}` create/update with `{ role: "admin" }` by non-admin user.
2. **Self-Training Bypass**: `users/{uid}` update setting `{ trainingVerified: true, trainingStatus: "verified" }`.
3. **Wallet Inflation**: `wallets/{uid}` update increasing `availableBalance` from `0` to `50000`.
4. **Negative Withdrawal Reserve**: `wallets/{uid}` update setting `availableBalance: -500, reservedBalance: 500`.
5. **Cross-User PII Snooping**: User B executing `get` on `users/{userA}` or `payment_methods/{userA}`.
6. **Blanket User Scraping**: Non-admin user executing `list` on `users` or `withdrawal_requests`.
7. **Duplicate Global FB Link Overwrite**: User B attempting `create` or `update` on an existing `global_facebook_pages/{canonicalKey}` owned by User A.
8. **Self-Approving Facebook Page**: User A updating `facebook_pages/{pageId}` with `{ status: "Work Active" }`.
9. **Spoofed Daily Submission Owner**: User A creating `daily_submissions/{id}` with `userId: userB`.
10. **Forged Weekly Salary Credit**: Non-admin user creating a document in `weekly_salaries/{id}` or `weekly_commissions/{id}`.
11. **Shadow Field Injection**: Updating `users/{uid}` profile with an unlisted ghost field `{ isSuperUser: true }`.
12. **Resource Exhaustion / ID Poisoning**: Creating `facebook_pages/{1500_char_id}` or injecting a 500KB string into `fullName`.
