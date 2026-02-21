-- Habilitar a extensão para UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Localizações
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Itens (Inventário)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT REFERENCES public.categories(name) ON UPDATE CASCADE,
    unit TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    min_value NUMERIC,
    location TEXT REFERENCES public.locations(name) ON UPDATE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Historico
CREATE TABLE IF NOT EXISTS public.history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID, -- Removido FK restritiva para permitir manter histórico de itens deletados
    item_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('add', 'remove', 'create', 'delete', 'edit')),
    amount NUMERIC DEFAULT 0,
    previous_value NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Gramaturas
CREATE TABLE IF NOT EXISTS public.gramatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    weight TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Vídeos
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);

-- Tabela de Tarefas (Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);

-- Tabela de Higiene (ANVISA)
CREATE TABLE IF NOT EXISTS public.hygiene_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    completed BOOLEAN DEFAULT false,
    last_completed TIMESTAMPTZ,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gramatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hygiene_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Exemplo geral para leitura/escrita)
-- Nota: Para uma aplicação real, você deve ajustar as políticas para que os usuários vejam apenas seus próprios dados.
-- Abaixo, uma política simplificada que permite acesso a usuários autenticados:

DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('CREATE POLICY "Allow all access to authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;
