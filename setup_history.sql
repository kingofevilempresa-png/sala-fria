-- Criação da tabela de histórico se não existir
CREATE TABLE IF NOT EXISTS public.history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL, -- Se o item for deletado, mantemos o histórico mas sem link
    item_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'create', 'delete', 'edit')),
    amount NUMERIC DEFAULT 0,
    previous_value NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS (Row Level Security) para segurança
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Cria política para permitir leitura para todos os usuários autenticados
create policy "Enable read access for all users"
on public.history
for select
to public
using (true);

-- Cria política para permitir inserção para todos os usuários autenticados
create policy "Enable insert access for all users"
on public.history
for insert
to public
with check (true);

-- Opcional: Política para update/delete apenas se necessário (geralmente histórico é append-only)
-- Se precisar apagar histórico antigo, pode adicionar:
-- create policy "Enable delete for users" on public.history for delete using (true);
