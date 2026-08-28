-- MAGASIN NOIBO — approval workflow safety constraints
-- A user can have many historical requests, but only one open PENDING request.

create unique index if not exists uq_approval_requests_one_pending
on public.approval_requests(user_id)
where status = 'PENDING';
