-- Lead temperature (warm/cold) for closing-rate analytics. Manually tagged per
-- partner; defaults to 'cold' (most BDR leads are prospected).
alter table public.partner_onboarding add column if not exists temperature text not null default 'cold';
