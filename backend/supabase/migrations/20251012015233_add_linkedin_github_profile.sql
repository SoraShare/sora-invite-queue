alter table "public"."users" drop constraint "users_github_url_key";

drop index if exists "public"."users_github_url_key";

alter table "public"."users" drop column "github_url";

alter table "public"."users" add column "auth_provider" text not null default 'email'::text;

alter table "public"."users" add column "github_profile_url" text;

alter table "public"."users" add column "linkedin_profile_url" text;

alter table "public"."users" alter column "email" set not null;

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";


