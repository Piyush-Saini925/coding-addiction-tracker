do $$
declare
  constraint_definition text;
begin
  select pg_get_constraintdef(oid)
    into constraint_definition
  from pg_constraint
  where conname = 'profiles_id_fkey'
    and conrelid = 'public.profiles'::regclass;

  if constraint_definition is null or constraint_definition not like '%auth.users%' then
    alter table public.profiles drop constraint if exists profiles_id_fkey;
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;
