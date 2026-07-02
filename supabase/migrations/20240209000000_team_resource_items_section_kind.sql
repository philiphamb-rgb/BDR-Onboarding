-- Resources Library sections become first-class rows (kind='section', category
-- null, data.name = section title) so they can be renamed and drag-reordered via
-- sort_order like every other resource row, instead of existing only implicitly
-- as a category string on library items.
alter table public.team_resource_items
  drop constraint team_resource_items_kind_check;

alter table public.team_resource_items
  add constraint team_resource_items_kind_check
  check (kind in ('tool','person','library','roadmap','section'));
