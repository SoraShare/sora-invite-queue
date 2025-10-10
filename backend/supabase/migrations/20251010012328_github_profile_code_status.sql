alter table "public"."users" add column "code" text[];

alter table "public"."users" add column "donated_codes" text[];

alter table "public"."users" add column "github_url" text;

CREATE UNIQUE INDEX users_github_url_key ON public.users USING btree (github_url);

alter table "public"."users" add constraint "users_github_url_key" UNIQUE using index "users_github_url_key";


