# Seções menores + Painel do administrador

## 1. Diminuir seções depois de "Como comprar"
- Reduzir espaçamentos, títulos, fotos e cartões das seções seguintes (destaques, depoimentos, localização, rodapé etc.) para ocuparem bem menos espaço, principalmente no celular.

## 2. Painel do administrador (página /admin)
Ativar o Lovable Cloud (banco de dados, login e armazenamento de fotos/vídeos).

Login:
- Página de entrada só para o administrador, com o e-mail informado e a senha inicial.
- Sem código por e-mail: entra direto. Opção de trocar e-mail e senha dentro do painel.
- Ninguém além do administrador consegue editar nada.

Abas do painel:
- **Visão geral**: número de acessos (por dia/semana) e pedidos recentes.
- **Pedidos**: lista de todos os pedidos feitos pelo site (salvos antes de abrir o WhatsApp), com status (novo, em preparo, entregue, cancelado).
- **Produtos**: criar, editar e apagar produtos — nome, preço, preço antigo, descrição, foto, categoria, selo (Lançamento, Oferta...), estoque, destaque sim/não, visível sim/não. Produto sem estoque aparece como "Esgotado".
- **Categorias**: nome, foto e ordem.
- **Página inicial**: textos de todas as seções, vídeo da linha Banana, fotos de fundo, banners e destaques.
- **Aparência**: cores principais do site.
- **Loja**: WhatsApp, endereço, formas de pagamento.

A loja passa a ler tudo do banco; os produtos e textos atuais são copiados para lá como ponto de partida, então nada muda visualmente até você editar.

## Detalhes técnicos
- Tabelas: products, categories, site_settings (JSON por chave), orders, page_views, user_roles + has_role; RLS: leitura pública de conteúdo, escrita só admin; insert público em orders/page_views.
- Bucket público "media" para uploads, escrita só admin.
- Admin criado com auto-confirm; rotas sob _authenticated com checagem de papel admin.
- Cores aplicadas como variáveis CSS a partir de site_settings.
