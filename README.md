# Controle de Carga — Kairat Futsal

App de questionário diário de carga/bem-estar (pré e pós-treino) para os atletas, com painel
de acompanhamento para a comissão técnica (ACWR, monotonia, strain). Português/Russo.

- `public/index.html` — frontend (single page, PT/RU, sem dependências além de Chart.js e Google Fonts via CDN).
- `functions/api/*.js` — Cloudflare Pages Functions (backend serverless).
- `schema.sql` — schema do banco de dados (Cloudflare D1 / SQLite).

Hospedado na Cloudflare Pages, conectado a este repositório — cada push republica automaticamente,
sem link fixo ("pin") para atualizar manualmente.
