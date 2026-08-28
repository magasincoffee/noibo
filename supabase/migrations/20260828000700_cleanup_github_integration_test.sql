-- MAGASIN NOIBO — remove temporary GitHub ↔ Supabase integration test
-- Safe cleanup: remove only the temporary marker table created by 20260828000600.

DROP TABLE IF EXISTS public._github_supabase_integration_test;
